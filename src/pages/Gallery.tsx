import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Camera, Upload, X, MapPin, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface GalleryPhoto {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  image_url: string;
  thumbnail_url: string | null;
  location_name: string | null;
  kp_at_capture: number | null;
  description: string | null;
  created_at: string;
}

async function compressImage(file: File, maxWidth: number, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('toBlob failed')); },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

const PAGE_SIZE = 12;

export default function Gallery() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GalleryPhoto | null>(null);

  const fetchPhotos = async (start: number, append: boolean) => {
    if (append) setLoadingMore(true);

    const { data } = await supabase
      .from('aurora_photos')
      .select('*')
      .order('created_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1);

    const rows = (data ?? []) as GalleryPhoto[];
    if (append) {
      setPhotos(prev => [...prev, ...rows]);
    } else {
      setPhotos(rows);
    }
    setNextOffset(start + rows.length);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { fetchPhotos(0, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError(t('gallery.uploadError') || 'Invalid file type');
      return;
    }
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setShowForm(true);
    setUploadError('');
  };

  const cancelUpload = () => {
    setShowForm(false);
    setSelectedFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setDescription('');
    setLocationName('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    setUploadError('');
    try {
      const photoId = crypto.randomUUID();
      const basePath = `${user.id}/${photoId}`;

      const [fullBlob, thumbBlob] = await Promise.all([
        compressImage(selectedFile, 1920, 0.88),
        compressImage(selectedFile, 400, 0.80),
      ]);

      const [fullRes, thumbRes] = await Promise.all([
        supabase.storage.from('aurora-gallery').upload(`${basePath}.jpg`, fullBlob, { contentType: 'image/jpeg' }),
        supabase.storage.from('aurora-gallery').upload(`${basePath}_thumb.jpg`, thumbBlob, { contentType: 'image/jpeg' }),
      ]);

      if (fullRes.error) throw fullRes.error;

      const imageUrl = supabase.storage.from('aurora-gallery').getPublicUrl(`${basePath}.jpg`).data.publicUrl;
      const thumbnailUrl = thumbRes.error
        ? null
        : supabase.storage.from('aurora-gallery').getPublicUrl(`${basePath}_thumb.jpg`).data.publicUrl;

      const { error: insertError } = await supabase.from('aurora_photos').insert({
        user_id: user.id,
        display_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        description: description.trim() || null,
        location_name: locationName.trim() || null,
      });

      if (insertError) throw insertError;

      setUploadMsg(t('gallery.uploadSuccess') || 'Photo shared!');
      setTimeout(() => setUploadMsg(''), 4000);
      cancelUpload();
      await fetchPhotos(0, false);
    } catch {
      setUploadError(t('gallery.uploadError') || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !user || user.id !== pendingDelete.user_id) return;
    await supabase.from('aurora_photos').delete().eq('id', pendingDelete.id);
    setPhotos(prev => prev.filter(p => p.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <div className="min-h-screen px-4 py-20 max-w-6xl mx-auto">
      <Helmet>
        <title>Aurora Gallery — The Storm Watcher</title>
        <meta name="description" content="Community aurora photos from around the world. Share your northern lights sightings." />
        <link rel="canonical" href="https://thestormwatcher.com/gallery" />
      </Helmet>

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('gallery.title') || 'Aurora Gallery'}</h1>
          <p className="text-[#94a3b8] mt-1">{t('gallery.subtitle') || 'Community aurora photos'}</p>
        </div>
        {user ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {t('gallery.upload') || 'Share your photo'}
          </button>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[#94a3b8] text-sm font-medium hover:text-white hover:bg-white/5 transition-colors"
          >
            <Camera className="w-4 h-4" />
            {t('gallery.signInToUpload') || 'Sign in to share photos'}
          </Link>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {uploadMsg && (
        <div className="mb-6 text-[#10b981] text-sm bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl px-4 py-3">
          {uploadMsg}
        </div>
      )}

      {showForm && previewUrl && (
        <div className="glass-surface rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex items-start gap-6 flex-wrap">
            <img src={previewUrl} alt="preview" className="w-40 h-40 object-cover rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-[200px] space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                  {t('gallery.description') || 'Caption (optional)'}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={200}
                  placeholder="Kp 7, amazing display over the lake…"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/30 transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                  {t('gallery.locationName') || 'Location (optional)'}
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  maxLength={100}
                  placeholder="Tromsø, Norway"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/30 transition-colors text-sm"
                />
              </div>
              {uploadError && <p className="text-[#ef4444] text-sm">{uploadError}</p>}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-white font-semibold text-sm disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? (t('gallery.uploading') || 'Uploading…') : (t('gallery.share') || 'Share')}
                </button>
                <button
                  onClick={cancelUpload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[#94a3b8] text-sm hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                  {t('profile.cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl skeleton" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-24">
          <Image className="w-16 h-16 text-[#334155] mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-1">{t('gallery.noPhotos') || 'No photos yet'}</p>
          <p className="text-[#64748b] text-sm mb-5">Be the first to share an aurora photo with the community!</p>
          {user ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Upload className="w-4 h-4" />
              Upload a Photo
            </button>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Sign in to Upload
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5">
                <img
                  src={photo.thumbnail_url ?? photo.image_url}
                  alt={photo.description ?? 'Aurora photo'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  {photo.description && (
                    <p className="text-white text-xs font-medium line-clamp-2 mb-1">{photo.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {photo.location_name && (
                      <span className="inline-flex items-center gap-1 text-[#94a3b8] text-xs">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {photo.location_name}
                      </span>
                    )}
                    {photo.kp_at_capture !== null && (
                      <span className="text-[#f97316] text-xs font-bold">Kp {photo.kp_at_capture.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    {photo.display_name && (
                      <p className="text-[#64748b] text-xs">{photo.display_name}</p>
                    )}
                    {user && user.id === photo.user_id && (
                      <button
                        onClick={() => setPendingDelete(photo)}
                        className="ml-auto text-[#ef4444]/70 hover:text-[#ef4444] transition-colors"
                        title="Delete photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => fetchPhotos(nextOffset, true)}
                disabled={loadingMore}
                className="px-6 py-3 rounded-xl border border-white/10 text-[#94a3b8] text-sm font-medium hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (t('app.loading') || 'Loading…') : (t('gallery.loadMore') || 'Load more')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={() => setPendingDelete(null)}>
          <div className="glass-surface rounded-2xl p-6 border border-white/10 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-2">{t('gallery.deleteTitle') || 'Delete photo?'}</h3>
            <p className="text-[#64748b] text-sm mb-5">{t('gallery.deleteConfirm') || 'This photo will be permanently removed from the gallery.'}</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444] text-white text-sm font-semibold hover:bg-[#dc2626] transition-colors"
              >
                {t('gallery.deleteYes') || 'Delete'}
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#94a3b8] text-sm font-medium hover:text-white hover:bg-white/5 transition-colors"
              >
                {t('profile.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

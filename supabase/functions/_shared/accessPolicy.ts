/**
 * Launch access policy shared by the website, checkout API and alert worker.
 * Keep all features free while the audience grows. Set this to false to
 * restore paid access, then redeploy both the website and send-kp-alerts.
 * This overrides any existing VITE_PAYMENTS_ENABLED=true deployment setting.
 */
export const FREE_ACCESS_ENABLED: boolean = true;

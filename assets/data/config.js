(function attachConfig(global) {
  // Solo URL y clave publicable/anon del proyecto. Nunca una clave service_role.
  global.STAND_CONFIG = {
    supabaseUrl: "https://qgxwhcwvlgsafffajyxj.supabase.co",
    supabasePublishableKey: "sb_publishable_956gJ9J9p5ACo8RCXUnSrA_f0GxW05U"
  };
})(typeof window !== "undefined" ? window : globalThis);

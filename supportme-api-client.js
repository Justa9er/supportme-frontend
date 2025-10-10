/* ============================================
   SUPPORTME API CLIENT
   Shared JavaScript for all dashboards
   Add this to EVERY dashboard HTML file
   ============================================ */

const SUPABASE_URL = 'https://ucekalsakfxczmaxfpkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZWthbHNha2Z4Y3ptYXhmcGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTUzNTUsImV4cCI6MjA2OTc5MTM1NX0.ONjltg1JIFhN480rHl-kObkCwqUgy3W34_YLS5aBqpQ';

// ============================================
// GET TENANT ID FROM URL
// ============================================
function getTenantId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tenant_id') || 'd23635f6-3b0a-475a-a4e5-7959b5091aa0'; // fallback to test ID
}

// ============================================
// LOAD TENANT DATA
// ============================================
async function loadTenantData() {
  const tenantId = getTenantId();
  
  try {
    // Query Supabase directly
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to load tenant data');
    }
    
    const tenants = await response.json();
    
    if (!tenants || tenants.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const tenant = tenants[0];
    
    // Get phone number if Ultimate plan
    let phoneNumber = null;
    if (tenant.plan === 'ultimate') {
      const phoneResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/telephony?tenant_id=eq.${tenantId}&select=did_number`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const phoneData = await phoneResponse.json();
      phoneNumber = phoneData[0]?.did_number || null;
    }
    
    // Build data object
    const data = {
      customer_number: tenant.customer_number,
      plan: tenant.plan,
      phone_number: phoneNumber,
      billing_date: tenant.next_billing_date || tenant.created_at,
      badge_url: getBadgeUrl(tenant.plan),
      show_upgrade_banner: tenant.plan !== 'ultimate'
    };
    
    // Update UI
    updateDashboardUI(data);
    
    // Store in sessionStorage for other functions
    sessionStorage.setItem('tenantData', JSON.stringify(data));
    sessionStorage.setItem('userPlan', data.plan);
    
    console.log('✅ Tenant data loaded:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error loading tenant data:', error);
    // Show fallback data
    const fallbackData = {
      customer_number: '000000000000',
      plan: 'starter',
      phone_number: null,
      badge_url: getBadgeUrl('starter'),
      show_upgrade_banner: true
    };
    updateDashboardUI(fallbackData);
    return fallbackData;
  }
}

// ============================================
// UPDATE DASHBOARD UI
// ============================================
function updateDashboardUI(data) {
  // Update customer number (if element exists)
  const customerNumberEl = document.querySelector('.customer-number');
  if (customerNumberEl) {
    customerNumberEl.textContent = data.customer_number;
  }
  
  // Update plan badge (if element exists)
  const badgeEl = document.getElementById('planBadge');
  if (badgeEl && data.badge_url) {
    badgeEl.src = data.badge_url;
    badgeEl.alt = `${data.plan} plan badge`;
  }
  
  // Update phone number in sidebar (if element exists)
  const phoneEls = document.querySelectorAll('.sidebar-static');
  if (phoneEls.length > 0 && data.phone_number) {
    phoneEls[0].textContent = data.phone_number;
  } else if (phoneEls.length > 0) {
    phoneEls[0].textContent = '503-555-5555'; // Default placeholder
  }
  
  // Show/hide upgrade button based on plan
  const upgradeBtns = document.querySelectorAll('button[onclick*="UPGRADE"], button[onclick*="upgrade"]');
  upgradeBtns.forEach(btn => {
    if (data.plan === 'ultimate') {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-block';
    }
  });
  
  // Apply feature gating based on plan
  applyFeatureGating(data.plan);
}

// ============================================
// APPLY FEATURE GATING
// ============================================
function applyFeatureGating(plan) {
  // Hide/show features based on plan
  
  // SMS/MMS features (Ultimate only)
  const smsFeatures = document.querySelectorAll('[data-feature="sms"], [data-feature="mms"]');
  smsFeatures.forEach(el => {
    if (plan !== 'ultimate') {
      el.style.display = 'none';
    }
  });
  
  // Voicemail features (Ultimate only)
  const voicemailFeatures = document.querySelectorAll('[data-feature="voicemail"]');
  voicemailFeatures.forEach(el => {
    if (plan !== 'ultimate') {
      el.style.display = 'none';
    }
  });
  
  // Team chat (Pro and Ultimate)
  const teamChatFeatures = document.querySelectorAll('[data-feature="team-chat"]');
  teamChatFeatures.forEach(el => {
    if (plan === 'starter') {
      el.style.display = 'none';
    }
  });
  
  // Internal notes (Pro and Ultimate)
  const notesFeatures = document.querySelectorAll('[data-feature="internal-notes"]');
  notesFeatures.forEach(el => {
    if (plan === 'starter') {
      el.style.display = 'none';
    }
  });
}

// ============================================
// GET BADGE URL HELPER
// ============================================
function getBadgeUrl(plan) {
  const badges = {
    'starter': 'https://ucekalsakfxczmaxfpkq.supabase.co/storage/v1/object/public/assets/starter-badge.png',
    'pro': 'https://ucekalsakfxczmaxfpkq.supabase.co/storage/v1/object/public/assets/pro-badge.png',
    'ultimate': 'https://ucekalsakfxczmaxfpkq.supabase.co/storage/v1/object/public/assets/ultimate-badge.png'
  };
  return badges[plan] || badges['starter'];
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Loading tenant data...');
  loadTenantData();
});

// ============================================
// EXPORT FOR OTHER SCRIPTS
// ============================================
window.SupportMEAPI = {
  getTenantId,
  loadTenantData,
  getBadgeUrl
};
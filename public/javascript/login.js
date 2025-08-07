document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  
  loginForm.addEventListener('submit', function(e) {
    const userId = document.getElementById('loginUserId').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Simple client-side validation
    if (!userId) {
      e.preventDefault();
      alert('Please enter your User ID');
      document.getElementById('loginUserId').focus();
      return;
    }
    
    if (!password) {
      e.preventDefault();
      alert('Please enter your password');
      document.getElementById('loginPassword').focus();
      return;
    }
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
  });
});
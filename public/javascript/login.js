document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginUserId = document.getElementById('loginUserId');
  const loginPassword = document.getElementById('loginPassword');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  }

  function hideError() {
    loginError.style.display = 'none';
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Signing In...';
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.textContent = 'Sign In';
    }
  }

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideError();

    const userId = loginUserId.value.trim();
    const password = loginPassword.value;
    
    // Client-side validation
    if (!userId) {
      showError('Please enter your User ID');
      loginUserId.focus();
      return;
    }
    
    if (!password) {
      showError('Please enter your password');
      loginPassword.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Successful login - redirect
        window.location.href = data.redirect;
      } else {
        // Show error from server
        showError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // Clear error when user starts typing
  loginUserId.addEventListener('input', hideError);
  loginPassword.addEventListener('input', hideError);
});
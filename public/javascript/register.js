document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  const errorMessage = document.getElementById('error-message');
  const registerBtn = document.querySelector('.register-btn');
  const btnText = document.querySelector('.btn-text');
  const spinner = document.querySelector('.spinner');

  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const formData = {
      name: document.getElementById('regName').value.trim(),
      userId: document.getElementById('regUserId').value.trim(),
      mobile_number: document.getElementById('phone').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      cadre: document.getElementById('regCadre').value,
      designation: document.getElementById('regDesignation').value.trim(),
      department: document.getElementById('regDepartment').value,
      password: document.getElementById('regPassword').value,
      confirmPassword: document.getElementById('regConfirmPassword').value,
      gender: document.querySelector('input[name="gender"]:checked').value
    };

    // Validate required fields
    for (const [key, value] of Object.entries(formData)) {
      if (!value) {
        showError(`Please fill in the ${key.replace('_', ' ')} field`);
        return;
      }
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      showError('Please enter a valid email address');
      return;
    }

    // Validate phone number
    if (!/^[0-9]{10,15}$/.test(formData.mobile_number)) {
      showError('Please enter a valid phone number (10-15 digits)');
      return;
    }

    // Show loading state
    setLoading(true);

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        // Registration successful - redirect to login page
        window.location.href = '/?registered=true';
      } else {
        // Show error message from server
        showError(result.error || 'Registration successful! Please login');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Network error. Please try again.');
      setLoading(false);
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function setLoading(isLoading) {
    if (isLoading) {
      registerBtn.disabled = true;
      btnText.textContent = 'Registering...';
      spinner.classList.remove('hidden');
      spinner.classList.add('visible');
    } else {
      registerBtn.disabled = false;
      btnText.textContent = 'Register';
      spinner.classList.add('hidden');
      spinner.classList.remove('visible');
    }
  }
});
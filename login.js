// Login form submission handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  try {
    const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
    // Login successful, redirect to dashboard
    window.location.href = 'user-dashboard.html';
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  }
});

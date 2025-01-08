// static/js/login.js

// This function handles the login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const errorMessage = document.getElementById('errorMessage');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data); // Debug logging
        
        if (data.success) {
            window.location.href = data.redirect_url || '/dashboard';
        } else {
            errorMessage.textContent = data.message || 'Login failed';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = 'An error occurred during login';
        errorMessage.style.display = 'block';
    }
}

// Add event listener to the form
document.getElementById('loginForm').addEventListener('submit', handleLogin);
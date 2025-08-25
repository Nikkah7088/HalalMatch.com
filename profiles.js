document.addEventListener('DOMContentLoaded', function() {
    // Example profiles (replace with API/Google Sheets integration)
    const profilesList = document.getElementById('profiles-list');
    profilesList.innerHTML = `
        <div class="profile-card">
            <img src="images/islamic-couple1.jpg" alt="Profile (face hidden)">
            <p><strong>Name:</strong> Ayesha (Face Hidden)</p>
            <p><strong>Status:</strong> Single</p>
            <p><strong>City:</strong> Lahore</p>
        </div>
        <div class="profile-card">
            <img src="images/islamic-couple2.jpg" alt="Profile">
            <p><strong>Name:</strong> Usman</p>
            <p><strong>Status:</strong> Single</p>
            <p><strong>City:</strong> Karachi</p>
        </div>
    `;
});
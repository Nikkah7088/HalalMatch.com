function filterProfiles() {
    var gender = document.getElementById('genderFilter').value;
    var city = document.getElementById('cityFilter').value;
    var age = document.getElementById('ageFilter').value;
    var cards = document.querySelectorAll('.profile-card');
    cards.forEach(function(card){
        var match = true;
        if (gender && card.getAttribute('data-gender') !== gender) match = false;
        if (city && card.getAttribute('data-city') !== city) match = false;
        if (age && parseInt(card.getAttribute('data-age')) != age) match = false;
        card.style.display = match ? 'inline-block' : 'none';
    });
}
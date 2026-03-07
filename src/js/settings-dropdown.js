// Settings dropdown: close when clicking outside
document.addEventListener('click', function (e) {
    var dd = document.getElementById('settingsDropdown');
    var btn = document.getElementById('settingsBtn');
    if (dd && btn && !dd.classList.contains('hidden') &&
        !dd.contains(e.target) && e.target !== btn) {
        dd.classList.add('hidden');
    }
});

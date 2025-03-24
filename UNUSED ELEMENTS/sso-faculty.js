// javascript for single sign on static authentication, but it is client side, meaning it only works on the same
//browser and if someone refreshes or clears data, it prompts them again. Also, if someone is tech savy and can use
//developer tools then they can bypass the signon
// limitations due to html/css only, and no backend access to netsuite.

document.addEventListener("DOMContentLoaded", function() {
    let authStatus = localStorage.getItem("wluAuthStatus");

    //check for URL params that would indicate some sort of return from authentication

    const urlParams = new URLSearchParams(window.location.search);
    const authComplete = urlParams.get('auth_complete');
    
    if (authComplete === 'true'){

        localStorage.setItem('wluAuthStatus', 'authenticated');
        authStatus = 'authenticated';


        history.replaceState(null, '', window.location.pathname);

        const redirectTarget = localStorage.getItem('wluRedirectTarget');
        if (redirectTarget){
            localStorage.removeItem('wluRedirectTarget');
            window.location.href = redirectTarget;
            return;
        }

    }
    setupProtectedLinks();
    updateUIBasedOnAuth(authStatus);
});

function setupProtectedLinks(){
    const protectedLinks = document.querySelectorAll('.protected-content-link');

    protectedLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            //get target URL 

            const targetUrl = this.getAttribute('href');
            //store URL for once the user is aunthenticated
            localStorage.setItem('wluRedirectTarget', targetUrl);
            
            // if already authenticated, proced to hidden content
            if (localStorage.getItem('wluAuthStatus') === 'authenticated') {
                window.location.href = targetUrl;
                // oopsie authentication failed
            } else {
                document.getElementById('authModal').style.display = 'block';        
            }
        });
    });

    document.getElementById('loginButton').addEventListener('click', function() {
        //login button 
        const returnUrl = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'auth_complete=true';
       // redirect to laurier's sso login
        window.location.href = 'https://mylearningspace.wlu.ca/d2l/lp/auth/saml/login?RelayState=' + encodeURIComponent(returnUrl);

        
    });

    document.querySelector('.close-button').addEventListener('click', function(){
        document.getElementById('authModal').style.display='none';
    });



}
function updateUIBasedOnAuth(authStatus){
    const authStatusIndicator = document.getElementById('authStatusIndicator');
    const logoutButton = document.getElementById('logoutButton');

    if (authStatus === 'authenticated'){
        if (authStatusIndicator) {
            authStatusIndicator.textContent = 'Authenticated! - WLU Member';
            authStatusIndicator.className = 'auth-status authenticated';
        }

        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
            logoutButton.addEventListener('click', function(){
                localStorage.removeItem('wluAuthStatus');
                location.reload();
            });
        }
    } else {
        if (authStatusIndicator) {
            authStatusIndicator.textContent = 'WLU Authentication Required to Access Faculty Custom Orders';
            authStatusIndicator.className = 'auth-status unauthenticated';
        }
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
    }
}
# TODO for OTP Implementation

## 1. Update signup.html
- [x] Change background gradient to golden (#D4AF37) and sky blue (#87CEEB)
- [x] Add EmailJS script for sending OTP emails
- [x] Implement real OTP generation (6 digits), storage in localStorage with expiry (10 min)
- [x] Send OTP via EmailJS to Gmail only
- [x] Block disposable emails
- [x] Add rate-limiting (60 sec) to Send OTP button
- [x] Confirm OTP with expiry check
- [x] Enable Create Account only after OTP confirmed
- [x] On signup, create user, send email verification, redirect to login.html?return=submit-profile.html

## 2. Update login.html
- [ ] Handle return URL parameter
- [ ] After successful login, redirect to return URL or submit-profile.html

## 3. Update profiles.html
- [x] Ensure Sign Up and Login links have ?return=profiles.html

## 4. Update submit-profile.html
- [ ] Remove prefixes from form field names (p, o, i) to match profiles.js expectations
- [ ] Ensure auth check redirects to signup with return

## 5. Update profiles.js
- [ ] Ensure field mapping matches the updated form fields
- [ ] Display profiles correctly from Firestore

## 6. Test Flow
- [ ] Signup with OTP
- [ ] Login
- [ ] Submit profile
- [ ] View profiles

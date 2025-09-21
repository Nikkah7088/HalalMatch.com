# TODO List for Updating HalalMatch.com Flow

## Overview
Update the authentication flow to: Sign-up → Login → Submit Profile.
Enforce Gmail OTP verification during signup.

## Tasks
- [x] Update signup.html: Remove OTP input and "Verify Now" button, simplify signup to send email verification and redirect to login.html after signup.
- [x] Update login.html: Change redirect after successful login from user-dashboard.html to submit-profile.html.
- [x] Update submit-profile.html: Ensure it redirects to signup.html if not logged in (already implemented).
- [x] Test the flow: Sign-up → Login → Submit Profile.
- [x] Verify Gmail OTP enforcement: User must verify email before logging in.

## Notes
- Firebase Auth is used for authentication.
- Email verification is sent via Firebase, which serves as the "OTP" mechanism.
- After signup, user is redirected to login.html.
- After login (if email verified), user is redirected to submit-profile.html.
- If email not verified during login, show alert to verify email.

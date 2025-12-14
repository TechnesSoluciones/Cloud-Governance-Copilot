# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e8]
      - heading "Verify Your Email" [level=3] [ref=e10]
      - paragraph [ref=e11]: Please check your inbox for a verification link
    - generic [ref=e12]:
      - alert [ref=e13]:
        - generic [ref=e16]:
          - paragraph [ref=e17]: Email verification required
          - paragraph [ref=e18]: We've sent a verification link to your email address. Please click the link to verify your account.
      - generic [ref=e19]:
        - paragraph [ref=e20]: "What to do next:"
        - list [ref=e21]:
          - listitem [ref=e22]: Check your email inbox for a message from Cloud Governance Copilot
          - listitem [ref=e23]: Click the verification link in the email
          - listitem [ref=e24]: You'll be redirected to your dashboard once verified
      - generic [ref=e25]:
        - paragraph [ref=e26]: Didn't receive the email?
        - list [ref=e27]:
          - listitem [ref=e28]: Check your spam or junk folder
          - listitem [ref=e29]: Make sure you entered the correct email address
          - listitem [ref=e30]: Wait a few minutes for the email to arrive
        - button "Resend Verification Email" [disabled]
        - paragraph [ref=e31]: Please log in to resend verification email
      - link "Back to Login" [ref=e33] [cursor=pointer]:
        - /url: /login
        - button "Back to Login" [ref=e34]
```
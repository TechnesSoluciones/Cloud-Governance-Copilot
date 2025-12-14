# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Login" [level=3] [ref=e6]
      - paragraph [ref=e7]: Enter your credentials to access your account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - text: Email
          - textbox "Email" [ref=e11]:
            - /placeholder: admin@copilot.com
        - generic [ref=e12]:
          - generic [ref=e13]:
            - generic [ref=e14]: Password
            - link "Forgot password?" [ref=e15] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "Password" [ref=e16]:
            - /placeholder: ••••••••
      - generic [ref=e17]:
        - button "Sign In" [ref=e18] [cursor=pointer]
        - paragraph [ref=e19]:
          - text: Don't have an account?
          - link "Register" [ref=e20] [cursor=pointer]:
            - /url: /register
```
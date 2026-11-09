// Amplify is used only for Cognito sign-in (VITE_AUTH_PROVIDER=cognito).
// Files are never accessed from the browser directly: the backend streams them after an ownership check.
import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    }
  }
})

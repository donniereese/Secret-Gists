module.exports = {
    Account: {
        Creation: {
            error: 'Account Creation Error',
            message: 'There was an error with some or all of the account information. Please check it and try again',
            status: 'Account_Creation_Invalid'
        }
    },
    User: {
        AccountErr: {
            error: 'Account Error',
            message: 'There was an error finding the account for the auth request; Please authorize again',
            status: 'Account_Error_Reauth'
        }
    },
    Auth: {
        Signin: {
            error: 'Signin Credentials Missing Or Errorous',
            message: 'The user credentials that were provided were either incomplete or were not found',
            status: 'Auth_Signin_Error'
        },
        Missing: {
            error: 'Unauthorized access without auth header',
            message: 'Unauthorized access without auth token is not permitted for the resource  requested',
            status: 'Auth_Error_Incomplete'
        },
        Expired: {
            error: 'Unauthorized access with expired auth header',
            message: 'Unauthorized access with expired auth token is not permitted for the resource requested',
            status: 'Auth_Expired'
        },
        NotAuthed: {
            error: 'Unauthorized access without authorization handshake',
            message: 'Unauthorized access without user authentication is not permitted for the resource requested',
            status: 'Auth_NotAuthed'
        },
        Invalid: {
            error: 'Unauthorized access with invalid auth header',
            message: 'Unauthorized access with invalid authorization header is not permitted for the resource requested',
            status: 'Auth_InvalidAuth'
        }
    }
};

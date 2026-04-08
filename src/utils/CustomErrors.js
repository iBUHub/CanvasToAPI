/**
 * File: src/utils/CustomErrors.js
 * Description: Custom error helpers for request handling
 *
 * Author: iBUHUB
 */

/**
 * Custom error class for user-aborted requests.
 * Kept for compatibility with any local throw sites or tests.
 */
class UserAbortedError extends Error {
    constructor(message = "The user aborted a request") {
        super(message);
        this.name = "UserAbortedError";
        this.isUserAborted = true;
    }
}

/**
 * Helper function to check if an error is a user abort.
 * @param {Error|Object} error - The error to check.
 * @returns {boolean} True if the error indicates user abort.
 */
function isUserAbortedError(error) {
    if (error instanceof UserAbortedError || error?.isUserAborted === true) {
        return true;
    }

    if (error?.name === "AbortError") {
        return true;
    }

    if (typeof error?.message === "string" && error.message.includes("The user aborted a request")) {
        return true;
    }

    return false;
}

module.exports = {
    isUserAbortedError,
    UserAbortedError,
};

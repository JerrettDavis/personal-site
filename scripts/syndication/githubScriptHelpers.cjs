const handleGithubScriptError = (error, actionLabel) => {
    const status = error?.status ?? error?.response?.status;
    if (status === 403 || status === 404) {
        console.warn(`${actionLabel} skipped: ${error.message}`);
        return true;
    }
    throw error;
};

module.exports = {handleGithubScriptError};

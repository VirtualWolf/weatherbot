export async function restartListener(messageText: string, botName: string) {
    const regexp = new RegExp(`^:${botName}: restart`);

    if (messageText.match(regexp)) {
        process.exit(0);
    } else {
        return [];
    }
}

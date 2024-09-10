# Discord Trading Bot

This is a **Discord bot** designed for managing trading credentials, tracking usage stats, and controlling access to the trading system. The bot includes various commands for users to generate credentials, view stats, and administrators to manage lockouts, bans, and usage limits.

## Prerequisites

Make sure you have the following installed:
- Python 3.8 or higher
- Libraries: 
  - discord
  - requests
  - matplotlib
  - asyncio
  - websockets
  - hmac, hashlib
  - json, os, time
  - random, string, re

Install the required libraries using:
```bash
pip install discord requests matplotlib
```

## Configuration

To run this bot, you'll need to set up the following:

- **Bot Token**: Obtain from Discord Developer Portal and set it as `BOT_TOKEN`.
- **Authorized User IDs**: List of user IDs who are authorized to use admin commands.
- **Server URLs**: Replace placeholders like `"serverUrl"` with your server's actual URL for handling requests.

## Features

### Commands

#### User Commands:
1. **Generate Credentials**
   - Command: `/credentials trading_name referer(optional)`
   - Description: Generates a unique username and password for a user to start trading.
   
   Example:
   ```bash
   /credentials trading_name="myname" referer="optional_friend"
   ```

2. **View Coins**
   - Command: `/coins`
   - Description: Fetches and displays the user's coin balance from the trading server.
   
   Example:
   ```bash
   /coins
   ```

#### Admin Commands:
1. **Ban User**
   - Command: `/ban-user user name`
   - Description: Bans a user's account, preventing future access.

   Example:
   ```bash
   /ban-user user="@discord_user" name="trading_name"
   ```

2. **Unban User**
   - Command: `/unban-user user name`
   - Description: Unbans a previously banned account.

   Example:
   ```bash
   /unban-user user="@discord_user" name="trading_name"
   ```

3. **Lock/Unlock Login**
   - Command: `/lock-login`, `/unlock-login`
   - Description: Locks or unlocks the ability for users to log in or register.

4. **Lock/Unlock Trading**
   - Command: `/lock-trading`, `/unlock-trading`
   - Description: Locks or unlocks trading activities on the server.

5. **Usage Stats**
   - Command: `/usage-stats`
   - Description: Displays usage statistics including successful trades, coins traded, and more in graphical form.

6. **Server Stats**
   - Command: `/stats`
   - Description: Shows an overview of server-wide statistics such as active users, trading locks, and cluster information.

7. **Lockdown/Release**
   - Command: `/lockdown`, `/release`
   - Description: Initiates or lifts a server-wide lockdown.

### Logging and Webhooks

- **Webhooks**: The bot uses webhooks for logging key events such as bans and locks.
- **Local Logging**: Logs are stored locally in the `log.txt` file, capturing activities like credential generation.

### Cooldown Management

Cooldowns for credential generation are managed through the `users.json` file. This file keeps track of which users have generated credentials and limits them from generating multiple sets.

### Matplotlib for Stats

The bot uses `matplotlib` to generate usage stats graphs for admins. These graphs are embedded into the bot's responses as images.

## Running the Bot

To run the bot, simply execute the following command:
```bash
python bot.py
```

The bot will sync its commands with your Discord server and become available to respond to interactions.

## License

Trading Server System © 2024 by mawo95 is licensed under CC BY-NC-SA 4.0 

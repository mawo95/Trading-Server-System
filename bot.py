import discord
from discord import app_commands
from discord.ext import commands
import requests
import random
import string
import json
import os
import time
from discord.ui import Select, View
import asyncio
import websockets
import hmac
import hashlib
import matplotlib.pyplot as plt
from io import BytesIO
import re


# bot token
BOT_TOKEN = ""

AUTHORIZED_USER_ID = []
COOLDOWN_FILE = "users.json"
LOG_FILE = "log.txt"

limit = 100000

# Discord Intents
intents = discord.Intents.default()
intents.typing = False
intents.presences = False

# Discord Bot
bot = commands.Bot(command_prefix="!", intents=intents)
#tree = app_commands.CommandTree(bot)

# Globale Variablen
login_lock_active = False
lockdown_active = False


def webhook(content,url):
    embed = discord.Embed(
        title="Log",
        description=content,
        #timestamp=discord.utils.utcnow()
    )
    embed.set_author(name="Trading Logs")
    requests.post(url, json={"embeds": [embed.to_dict()]})
    
    # Log in log.txt
    with open(LOG_FILE, "a") as f:
        f.write(f"{discord.utils.utcnow()} - {content}\n")


def generate_password(length=6):
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(length))


def load_cooldowns():
    if not os.path.exists(COOLDOWN_FILE):
        return {}
    with open(COOLDOWN_FILE, "r") as f:
        return json.load(f)


def save_cooldowns(cooldowns):
    with open(COOLDOWN_FILE, "w") as f:
        json.dump(cooldowns, f, indent=4)
        

def is_valid_trading_name(name):
    if name == "mawosbot":
        return False
    creds = load_cooldowns()
    for i in creds:
        if creds[i]["trading_name"] == name:
            return False
        
    return name.isalnum() and name.islower() and len(name) <= 12 and len(name) > 3


credentials_generated = load_cooldowns()



@bot.tree.command(name="credentials", description="Generate credentials")
@discord.app_commands.describe(trading_name="Set ur Trading Name! a-z and 0-9 lowercase!")
@discord.app_commands.describe(referer="Someone recommended us? Support them!")
async def credentials(interaction: discord.Interaction, trading_name: str, referer: str = None):
    global limit
    global lockdown_active
    global login_lock_active
    
    if lockdown_active:
        await interaction.response.send_message("The system is currently locked.", ephemeral=True)
        return
    
    if login_lock_active:
        await interaction.response.send_message("Registrations and Logins are currently locked.",ephemeral=True)
        return
    
    if limit == 0:
        await interaction.response.send_message("The beta is full now. We will soon open it for everyone")
        return

    user_id = interaction.user.id
    if str(user_id) in credentials_generated:
        await interaction.response.send_message("You have already generated your credentials.", ephemeral=True)
        return
    
    if not is_valid_trading_name(trading_name):

            await interaction.response.send_message("**Invalid** trading name. Or its already **taken**. It must be lowercase, alphanumeric, and up to 12 characters long and not less than 4 characters", ephemeral=True)
            return

    password = generate_password()
    username = interaction.user.name

    av = str(interaction.user.avatar)

    response = None
    if referer != None:
        if not is_valid_trading_name(referer):
            response = requests.post("sevrerUrl", json={"username": username, "password": password, "avatar":av, "tradingName":trading_name, "discordId":interaction.user.id})
        else:
            response = requests.post("serverUrl", json={"username": username, "password": password, "avatar":av, "tradingName":trading_name, "discordId":interaction.user.id, "referer":referer})
    else:
        
        response = requests.post("serverUrl", json={"username": username, "password": password, "avatar":av, "tradingName":trading_name, "discordId":interaction.user.id})

    if response.status_code == 200:
    #gives users their username and password for trading :)
        embed = discord.Embed(title="Your Credentials", description=f"Username: {username}\nPassword: {password}")
        try:
            await interaction.user.send(embed=embed)
        
            await interaction.response.send_message("Credentials have been sent to your DMs.", ephemeral=True)
            credentials_generated[str(user_id)] = {"username": username, "password": password, "trading_name":trading_name}
            save_cooldowns(credentials_generated)
            limit -= 1
      #      webhook(username + "\n"+password +"\n" + trading_name, webhookAccount)
        
        except:
            await interaction.response.send_message("Turn on dms from everyone on this server to receive ur data", ephemeral=True)
            
            requests.post("serverUrl",json={"password":password,"username":username})
      #      webhook(username + " dms are off",webhookAccount)
                
        
    else:
        await interaction.response.send_message("There was an error generating your credentials.", ephemeral=True)

        
        
        
@bot.tree.command(name="coins",description="see your coins")
async def coins(interaction: discord.Interaction):
   
    response = requests.get("serverUrl"+str(interaction.user.id)+"/now")
    response2 = response.text
    await interaction.response.send_message("You got " + response2 + " coins!")

        
@bot.tree.command(name="ban-user",description="Ban a users account and future accounts")   
@discord.app_commands.describe(user="The user")
@discord.app_commands.describe(name="The trading name to ban")
async def ban_user(interaction: discord.Interaction, user: discord.User = None, name: str = None):
    if interaction.user.id not in AUTHORIZED_USER_ID:
        
        await interaction.response.send_message("You arent alloud to use this command!",ephemeral=True)
        return
    lol = load_cooldowns()
    
    
    if user == None and name == None:
        await interaction.response.send_message("we need one option ;)")
    else:
        if name == None:
            lol[str(user.id)] = {"username": "Banned", "password": "Banned", "trading_name":"Banned"}

            save_cooldowns(lol)
    
    
            response = requests.get("")

            if response.status_code == 200:
                await interaction.response.send_message("Banned.")
            else:
                await interaction.response.send_message("Error while banning server side")
        
        else:
            response = requests.get("")

            if response.status_code == 200:
                await interaction.response.send_message("Banned.")
            else:
                await interaction.response.send_message("Error while banning server side")
            
        
        
        
        
        
        
        
        
        
@bot.tree.command(name="unban-user",description="Unban a users account and future accounts")   
@discord.app_commands.describe(user="The user")
@discord.app_commands.describe(name="The trading name to unban")
async def ban_user(interaction: discord.Interaction, user: discord.User = None, name: str = None):
    if interaction.user.id not in AUTHORIZED_USER_ID:
        
        await interaction.response.send_message("You arent alloud to use this command!",ephemeral=True)
        return
    lol = load_cooldowns()
    
    
    if user == None and name == None:
        await interaction.response.send_message("we need one option ;)")
    else:
        if name == None:
            del lol[str(user.id)]

            save_cooldowns(lol)
    
    
            response = requests.get("")

            if response.status_code == 200:
                await interaction.response.send_message("Unbanned.")
            else:
                await interaction.response.send_message("Error while unbanning server side")
        
        else:
            response = requests.get("")

            if response.status_code == 200:
                await interaction.response.send_message("Unbanned.")
            else:
                await interaction.response.send_message("Error while unbanning server side")
            
            

    
@bot.tree.command(name="usage-stats", description="Shows a neat usage stats graph")
async def usage_stats(interaction: discord.Interaction):
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("Not for you", ephemeral=True)
    else:   
        response = requests.get('')
        history = response.json()

        # Daten für das Diagramm vorbereiten
        timestamps = [entry['timestamp'] for entry in history]
        successful_trades = [entry['stats']['successfulTrades'] for entry in history]
        total_coins = [entry['stats']['totalCoinsTraded'] for entry in history]
        total_cards = [entry['stats']['totalCardsTraded'] for entry in history]

        # Stil auf Dark Mode setzen
        plt.style.use('dark_background')

        plt.figure(figsize=(12, 8))

        # Diagramm 1: Trades (total, successful, failed)
        plt.subplot(3, 1, 1)
        plt.plot(timestamps, successful_trades, marker='o', label='Successful Trades', color='#FFDD44')
        plt.title('Trades Over Time', color='white')
        plt.xlabel('Time', color='white')
        plt.ylabel('Number of Trades', color='white')
        plt.xticks(color='white')
        plt.yticks(color='white')
        plt.legend()

        # Diagramm 2: Coins Traded
        plt.subplot(3, 1, 2)
        plt.plot(timestamps, total_coins, marker='o', label='Total Coins Traded', color='#66FF66')
        plt.title('Coins Traded Over Time', color='white')
        plt.xlabel('Time', color='white')
        plt.ylabel('Total Coins Traded', color='white')
        plt.xticks(color='white')
        plt.yticks(color='white')
        plt.legend()

        # Diagramm 3: Cards Traded
        plt.subplot(3, 1, 3)
        plt.plot(timestamps, total_cards, marker='o', label='Total Cards Traded', color='#9966FF')
        plt.title('Cards Traded Over Time', color='white')
        plt.xlabel('Time', color='white')
        plt.ylabel('Total Cards Traded', color='white')
        plt.xticks(color='white')
        plt.yticks(color='white')
        plt.legend()

        # Diagramm speichern und an Discord senden
        plt.tight_layout()
        buffer = BytesIO()
        plt.savefig(buffer, format='png', facecolor='#2C2F33')  # Hintergrundfarbe auf Discord's dunkelgrau setzen
        buffer.seek(0)
        await interaction.response.send_message(file=discord.File(buffer, 'stats.png'))
        
        
@bot.tree.command(name="lock-login", description="Lock logins and registrations")
async def lock_login(interaction: discord.Interaction):
    global login_lock_active
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("You are not authorized to use this command.", ephemeral=True)
        return

    response = requests.get("")

    if response.status_code == 200:
        login_lock_active = True
        embed = discord.Embed(title="Registrations and Logins Locked!")
        await interaction.response.send_message(embed=embed)
    else:
        embed = discord.Embed(title="Error!")
        await interaction.response.send_message(embed=embed)

  #  log_to_webhook(interaction.user, "lock-login", "Admin Command")

# /unlock-login Command
@bot.tree.command(name="unlock-login", description="Unlock logins and registrations")
async def unlock_login(interaction: discord.Interaction):
    global login_lock_active
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("You are not authorized to use this command.", ephemeral=True)
        return

    response = requests.get("")

    if response.status_code == 200:
        login_lock_active = False
        embed = discord.Embed(title="Registrations and Logins Unlocked!")
        await interaction.response.send_message(embed=embed)
    else:
        embed = discord.Embed(title="Error!")
        await interaction.response.send_message(embed=embed)

  #  log_to_webhook(interaction.user, "unlock-login", "Admin Command")        
        
# /lock-trading Command
@bot.tree.command(name="lock-trading", description="Lock trading")
async def lock_trading(interaction: discord.Interaction):
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("You are not authorized to use this command.", ephemeral=True)
        return

    response = requests.get("")

    if response.status_code == 200:
        embed = discord.Embed(title="Locked!")
        await interaction.response.send_message(embed=embed)
    else:
        embed = discord.Embed(title="Error!")
        await interaction.response.send_message(embed=embed)

  #  log_to_webhook(interaction.user, "lock-trading", "Admin Command")

# /unlock-trading Command
@bot.tree.command(name="unlock-trading", description="Unlock trading")
async def unlock_trading(interaction: discord.Interaction):
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("You are not authorized to use this command.", ephemeral=True)
        return

    response = requests.get("")

    if response.status_code == 200:
        embed = discord.Embed(title="Unlocked!")
        await interaction.response.send_message(embed=embed)
    else:
        embed = discord.Embed(title="Error!")
        await interaction.response.send_message(embed=embed)

   # log_to_webhook(interaction.user, "unlock-trading", "Admin Command")

# /lockdown Command
@bot.tree.command(name="lockdown", description="Initiate lockdown")
async def lockdown(interaction: discord.Interaction):
    global lockdown_active
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("You are not authorized to use this command.", ephemeral=True)
        return

    response = requests.get("")

    if response.status_code == 200:
        lockdown_active = True
        embed = discord.Embed(title="Locked!")
        await interaction.response.send_message(embed=embed)
    else:
        embed = discord.Embed(title="Error!")
        await interaction.response.send_message(embed=embed)

   # log_to_webhook(interaction.user, "lockdown", "Admin Command")

# /release Command
@bot.tree.command(name="release", description="Release lockdown")
async def release(interaction: discord.Interaction):
    global lockdown_active
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("You are not authorized to use this command.", ephemeral=True)
        return

    response = requests.get("")

    if response.status_code == 200:
        lockdown_active = False
        embed = discord.Embed(title="Released!")
        await interaction.response.send_message(embed=embed)
    else:
        embed = discord.Embed(title="Error!")
        await interaction.response.send_message(embed=embed)


        

@bot.tree.command(name="stats", description="Shows Trading server stats")
async def stats(interaction: discord.Interaction):
    if interaction.user.id not in AUTHORIZED_USER_ID:
        await interaction.response.send_message("Not for you!")
        return
    # Fetch general stats
    response = requests.get("")
    data = response.json()
    print(data)
    
    # Create the initial embed for general stats
    embed = discord.Embed(title="General Overview", description="Server-wide statistics")
    embed.add_field(name="Cluster Count", value=data["amount"], inline=True)
    embed.add_field(name="Login Locked", value=data["loginLocked"], inline=True)
    embed.add_field(name="Trading Locked", value=data["tradingLocked"], inline=True)
    embed.add_field(name="Lockdown", value=data["lockdown"], inline=True)
    embed.add_field(name="Online users", value=data["online"], inline=True)
    embed.add_field(name="Current invites", value=data["invites"], inline=True)
    embed.add_field(name="Total users", value=data["users"], inline=True)

    # Create select options for clusters
    options = [discord.SelectOption(label='General Overview', description='General server stats', value='general')]
    clusters = data["clusters"]
    for pid, cluster in clusters.items():
        options.append(discord.SelectOption(label=f'Cluster {pid}', description=f'Stats for cluster {pid}', value=str(pid)))

    select = Select(placeholder="Choose an option...", options=options)

    async def select_callback(interaction):
        if select.values[0] == 'general':
            # Re-fetch general stats
            response = requests.get("")
            data = response.json()
            embed.clear_fields()
            embed.title = "General Overview"
            embed.description = "Server-wide statistics"
            embed.add_field(name="Cluster amount", value=data["amount"], inline=True)
            embed.add_field(name="Login Locked", value=data["loginLocked"], inline=True)
            embed.add_field(name="Trading Locked", value=data["tradingLocked"], inline=True)
            embed.add_field(name="Lockdown", value=data["lockdown"], inline=True)
            embed.add_field(name="Online users", value=data["online"], inline=True)
            embed.add_field(name="Current invites", value=data["invites"], inline=True)
            embed.add_field(name="Total users", value=data["users"], inline=True)
        else:
          pid = select.values[0]
          try:
            cluster_stats = clusters[pid]["stats"]
            memory_usage = cluster_stats["system"]["memoryUsage"]
            cpu_usage = cluster_stats["system"]["cpuUsage"]

            embed.clear_fields()
            embed.title = f"Cluster {pid} Stats"
            embed.add_field(name="Cluster Connections", value=cluster_stats["clusterConnections"], inline=True)
            embed.add_field(name="RSS Memory Usage", value=memory_usage["rss"], inline=True)
            embed.add_field(name="Heap Total", value=memory_usage["heapTotal"], inline=True)
            embed.add_field(name="Heap Used", value=memory_usage["heapUsed"], inline=True)
            embed.add_field(name="External Memory", value=memory_usage["external"], inline=True)
            embed.add_field(name="CPU Usage (1 min)", value=cpu_usage["1min"], inline=True)
            embed.add_field(name="CPU Usage (5 min)", value=cpu_usage["5min"], inline=True)
            embed.add_field(name="CPU Usage (15 min)", value=cpu_usage["15min"], inline=True)
          except:
            pass
        await interaction.response.edit_message(embed=embed)

    select.callback = select_callback

    view = View()
    view.add_item(select)

    await interaction.response.send_message(embed=embed, view=view)


@bot.event
async def on_ready():
   
    await bot.tree.sync(guild=None)
    await bot.change_presence(activity=discord.Game(name="Trading Management"))
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print("------")
    
    

bot.run(BOT_TOKEN)

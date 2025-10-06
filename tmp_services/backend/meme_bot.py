import json
import time
import requests
from web3 import Web3

# Load Configuration
with open("config.json") as config_file:
    config = json.load(config_file)

# Connect to Binance Smart Chain
BSC_RPC = "https://bsc-dataseed.binance.org/"
web3 = Web3(Web3.HTTPProvider(BSC_RPC))

assert web3.is_connected(), "⚠️ ERROR: Cannot connect to Binance Smart Chain!"

# Wallet & Token Details
WALLET_ADDRESS = config["wallet"]["address"]
PRIVATE_KEY = config["wallet"].get("private_key", None)  # Use if signing transactions
TOKEN_ADDRESS = config["token"]["address"]

# PancakeSwap Router Contract
ROUTER_ADDRESS = web3.to_checksum_address(config["pancakeswap"]["router_address"])
FACTORY_ADDRESS = web3.to_checksum_address(config["pancakeswap"]["factory_address"])
router_contract = web3.eth.contract(address=ROUTER_ADDRESS, abi=[...])  # Replace with PancakeSwap ABI

# Telegram Details
TELEGRAM_BOT_TOKEN = config["telegram"]["bot_token"]
TELEGRAM_CHAT_ID = config["telegram"]["chat_id"]

# Fetch Token Price
def get_token_price(token_address):
    """Fetch token price from PancakeSwap."""
    try:
        response = requests.get(f"https://api.pancakeswap.info/api/v2/tokens/{token_address}")
        data = response.json()
        return float(data["data"]["price"])
    except Exception:
        return "Price retrieval failed"

# Telegram Notifications
def send_telegram_message(message):
    """Send a message to Telegram."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message}
    response = requests.post(url, data=payload)

    if response.status_code == 200:
        print(f"✅ Telegram message sent: {message}")
    else:
        print(f"⚠ Failed to send Telegram message: {response.text}")

# Execute Trade
def execute_trade():
    """Execute a trade on PancakeSwap."""
    try:
        amount_in_bnb = config["trading"]["trade_amount"]
        slippage = config["trading"]["slippage"]

        amount_out_min = int(web3.to_wei(amount_in_bnb, "ether") * (1 - (slippage / 100)))
        path = [web3.to_checksum_address(WALLET_ADDRESS), web3.to_checksum_address(TOKEN_ADDRESS)]
        deadline = int(time.time()) + 60  # 1-minute deadline

        transaction = router_contract.functions.swapExactETHForTokens(
            amount_out_min, path, WALLET_ADDRESS, deadline
        ).build_transaction({
            "from": WALLET_ADDRESS,
            "value": web3.to_wei(amount_in_bnb, "ether"),
            "gas": 250000,
            "gasPrice": web3.to_wei(5, "gwei"),
            "nonce": web3.eth.get_transaction_count(WALLET_ADDRESS),
        })

        # Sign and send the transaction
        signed_tx = web3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)

        # Print & Telegram Notification
        print(f"✅ Trade executed successfully! TX Hash: {web3.to_hex(tx_hash)}")
        send_telegram_message(f"Trade executed: {amount_in_bnb} BNB for token at price {get_token_price(TOKEN_ADDRESS)}. Tx Hash: {web3.to_hex(tx_hash)}")

    except Exception as e:
        error_msg = str(e) if "data" not in str(e) else "Unexpected error."
        send_telegram_message(f"⚠ Error: {error_msg}")

# Main Loop
if __name__ == "__main__":
    while True:
        execute_trade()
        time.sleep(600)  # Wait 10 minutes before the next trade


import json
import time
import requests
import os
import logging
from web3 import Web3
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv("secret.env")

PRIVATE_KEY = os.getenv("BNB_PRIVATE_KEY")
BSC_RPC_URL = os.getenv("BSC_RPC_URL")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
BSCSCAN_API_KEY = os.getenv("BSCSCAN_API_KEY")

# ✅ Web3 Connection (BSC RPC)
w3 = Web3(Web3.HTTPProvider(BSC_RPC_URL))
wallet_address = w3.eth.account.from_key(PRIVATE_KEY).address

# ✅ Setup Logging
logging.basicConfig(
    filename="trade_log.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

def log_event(message):
    print(message)  # ✅ Ensure real-time console output
    logging.info(message)  # ✅ Write to log file

# ✅ Define Critical Addresses
PANCAKESWAP_ROUTER = w3.to_checksum_address("0x10ED43C718714eb63d5AA57B78B54704E256024E")
PANCAKESWAP_FACTORY = w3.to_checksum_address("0xBCfCcbde45cE874adCB698cC183deBcF17952812")
WBNB_ADDRESS = w3.to_checksum_address("0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")

# ✅ Load ABIs (Only Once)
with open("pancakeswap_factory_abi.json", "r") as abi_file:
    FACTORY_ABI = json.load(abi_file)

with open("pancakeswap_router_abi.json", "r") as abi_file:
    PANCAKESWAP_ABI = json.load(abi_file)

with open("pancakeswap_pair_abi.json", "r") as abi_file:
    PAIR_ABI = json.load(abi_file)

with open("erc20_abi.json", "r") as abi_file:
    TOKEN_ABI = json.load(abi_file)

# ✅ Create Contract Instances
factory = w3.eth.contract(address=PANCAKESWAP_FACTORY, abi=FACTORY_ABI)
router = w3.eth.contract(address=PANCAKESWAP_ROUTER, abi=PANCAKESWAP_ABI)

# ✅ Excluded Tokens (Stablecoins, Blue-Chip Tokens)
EXCLUDED_TOKENS = {
    "0x55d398326f99059ff775485246999027b3197955".lower(),  # USDT (Tether)
    "0xbb4cdb9cb36b01bd1cbaeBF2de08d9173bc095c".lower(),  # WBNB (Wrapped BNB)
    "0xe9e7cea3dedca5984780bafc599bd69add087d56".lower(),  # BUSD (Binance USD - Old)
}

# ✅ Function to Get Token Addresses from a Pair Contract
def get_token_addresses(pair_address):
    """
    Retrieves token0 and token1 from the PancakeSwap Pair contract.
    """
    try:
        pair_contract = w3.eth.contract(address=w3.to_checksum_address(pair_address), abi=PAIR_ABI)
        token0 = pair_contract.functions.token0().call()
        token1 = pair_contract.functions.token1().call()
        return token0, token1
    except Exception as e:
        log_event(f"❌ Error fetching token addresses for {pair_address}: {str(e)}")
        return None, None

# ✅ Wait for Transaction Receipt
def wait_for_transaction_receipt(txn_hash, timeout=120):
    """
    Waits for a transaction receipt and returns the status.
    Returns True if successful, False if failed, None if timeout.
    """
    log_event(f"⏳ Waiting for transaction {txn_hash.hex()} to be mined...")
    
    try:
        # Wait for the transaction receipt with timeout
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                receipt = w3.eth.get_transaction_receipt(txn_hash)
                if receipt is not None:
                    if receipt["status"] == 1:
                        log_event(f"✅ Transaction successful! Gas used: {receipt['gasUsed']}")
                        return True
                    else:
                        log_event(f"❌ Transaction failed! Gas used: {receipt['gasUsed']}")
                        return False
            except Exception:
                # Transaction not yet mined
                pass
                
            # Sleep to avoid hammering the RPC
            time.sleep(2)
            
        log_event(f"⚠️ Transaction timeout - status unknown")
        return None
        
    except Exception as e:
        log_event(f"❌ Error checking transaction: {str(e)}")
        return None

# ✅ Get Token Information
def get_token_info(token_address):
    """
    Gets token name, symbol, and decimals.
    """
    token_abi_extended = [
        {
            "constant": True,
            "inputs": [],
            "name": "name",
            "outputs": [{"name": "", "type": "string"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [],
            "name": "symbol",
            "outputs": [{"name": "", "type": "string"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "type": "function"
        }
    ]
    
    try:
        token_contract = w3.eth.contract(address=w3.to_checksum_address(token_address), abi=token_abi_extended + TOKEN_ABI)
        
        try:
            name = token_contract.functions.name().call()
        except Exception:
            name = "Unknown"
            
        try:
            symbol = token_contract.functions.symbol().call()
        except Exception:
            symbol = "???"
            
        try:
            decimals = token_contract.functions.decimals().call()
        except Exception:
            decimals = 18  # Default to 18 decimals
            
        return {
            "address": token_address,
            "name": name,
            "symbol": symbol,
            "decimals": decimals
        }
        
    except Exception as e:
        log_event(f"❌ Error fetching token info: {str(e)}")
        return {
            "address": token_address,
            "name": "Unknown",
            "symbol": "???",
            "decimals": 18
        }

# ✅ Telegram Notification Functions
def telegram_notify(message):
    """
    Sends a notification to Telegram.
    """
    try:
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            return False
            
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        
        response = requests.post(url, data=data)
        return response.status_code == 200
    except Exception as e:
        log_event(f"❌ Telegram notification failed: {str(e)}")
        return False

def send_trade_notification(action, token_info, amount, price=None, profit_loss=None):
    """
    Sends a nicely formatted trade notification to Telegram.
    """
    bscscan_url = f"https://bscscan.com/token/{token_info['address']}"
    
    if action.lower() == "buy":
        message = (
            f"🟢 <b>BUY ORDER EXECUTED</b>\n\n"
            f"• Token: <b>{token_info['symbol']}</b> ({token_info['name']})\n"
            f"• Amount: {amount} BNB\n"
            f"• Token Address: <a href='{bscscan_url}'>{token_info['address'][:6]}...{token_info['address'][-4:]}</a>"
        )
    elif action.lower() == "sell":
        message = (
            f"🔴 <b>SELL ORDER EXECUTED</b>\n\n"
            f"• Token: <b>{token_info['symbol']}</b> ({token_info['name']})\n"
            f"• Amount: {amount}%\n"
        )
        
        if profit_loss is not None:
            emoji = "🟢" if profit_loss > 0 else "🔴"
            message += f"• P&L: {emoji} {profit_loss:.2f}%\n"
            
        message += f"• Token Address: <a href='{bscscan_url}'>{token_info['address'][:6]}...{token_info['address'][-4:]}</a>"
    
    return telegram_notify(message)

# ✅ Get Deployer Address
def get_deployer_address(token_address):
    """
    Gets the deployer address of a token contract.
    """
    try:
        # Using BSCScan API
        if not BSCSCAN_API_KEY:
            log_event("⚠️ No BSCScan API key found. Skipping deployer check.")
            return None
            
        # Fetch contract creation transaction
        url = f"https://api.bscscan.com/api?module=account&action=txlist&address={token_address}&page=1&offset=1&sort=asc&apikey={BSCSCAN_API_KEY}"
        response = requests.get(url)
        data = response.json()
        
        if data["status"] == "1" and data["result"]:
            # The first transaction should be the contract creation
            deployer = data["result"][0]["from"]
            log_event(f"✅ Found deployer address: {deployer}")
            return deployer
            
        # Fallback: unable to fetch deployer
        log_event("⚠️ Could not fetch deployer from BSCScan API.")
        return None
            
    except Exception as e:
        log_event(f"❌ Error fetching deployer address: {str(e)}")
        return None

# ✅ Approve Token Function
def approve_token(token_address):
    """
    Approves token for trading if required.
    """
    try:
        token_contract = w3.eth.contract(address=w3.to_checksum_address(token_address), abi=TOKEN_ABI)

        # Check if approval is needed
        allowance = token_contract.functions.allowance(wallet_address, PANCAKESWAP_ROUTER).call()
        if allowance > 0:
            log_event(f"✅ Token {token_address} already approved.")
            return True  # No need to approve again

        log_event(f"🔑 Approving token {token_address} for trading...")
        txn = token_contract.functions.approve(
            PANCAKESWAP_ROUTER, 
            Web3.to_wei(2**256-1, "ether")
        ).build_transaction({
            "from": wallet_address,
            "gas": 100000,
            "gasPrice": w3.eth.gas_price,
            "nonce": w3.eth.get_transaction_count(wallet_address)
        })

        signed_txn = w3.eth.account.sign_transaction(txn, PRIVATE_KEY)
        txn_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)

        # Wait for transaction receipt
        approval_status = wait_for_transaction_receipt(txn_hash)
        if approval_status:
            log_event(f"✅ Approval successful for {token_address}")
            return True
        elif approval_status is False:
            log_event(f"❌ Approval failed for {token_address}")
            return False
        else:
            log_event(f"⚠️ Approval status unknown for {token_address}. Proceeding with caution.")
            return True  # Assume approval succeeded if we can't determine

    except Exception as e:
        log_event(f"❌ Approval failed for {token_address}: {e}")
        return False

# ✅ Check Liquidity Function
def check_liquidity(token_address):
    """
    Ensures there is at least X BNB liquidity in the trading pair.
    Returns the BNB liquidity amount, or None if insufficient.
    """
    log_event(f"💰 Checking liquidity for {token_address}...")

    try:
        # Skip check for WBNB itself
        if token_address.lower() == WBNB_ADDRESS.lower():
            log_event(f"⚠️ Skipping liquidity check for WBNB.")
            return 9999  # Return a large number for WBNB
        
        # Get pair address
        pair_address = factory.functions.getPair(
            WBNB_ADDRESS,
            w3.to_checksum_address(token_address)
        ).call()

        if pair_address == "0x0000000000000000000000000000000000000000":
            log_event(f"❌ No liquidity for {token_address}.")
            return None  # No trading pair exists

        # Load Pair Contract
        pair_contract = w3.eth.contract(address=w3.to_checksum_address(pair_address), abi=PAIR_ABI)

        # Fetch Reserves
        reserves = pair_contract.functions.getReserves().call()
        token0 = pair_contract.functions.token0().call()
        token1 = pair_contract.functions.token1().call()

        # Determine which reserve is WBNB
        if token0.lower() == WBNB_ADDRESS.lower():
            bnb_reserve = reserves[0] / 10**18  # Convert from Wei to BNB
        else:
            bnb_reserve = reserves[1] / 10**18  # Convert from Wei to BNB

        if bnb_reserve < 10:
            log_event(f"❌ Low liquidity ({bnb_reserve:.2f} BNB) for {token_address}.")
            return None  # Insufficient liquidity

        log_event(f"✅ Confirmed liquidity for {token_address}: {bnb_reserve:.2f} BNB")
        return bnb_reserve  # Return actual BNB liquidity for tracking

    except Exception as e:
        log_event(f"❌ Liquidity Check Failed: {str(e)}")
        return None  # Assume no liquidity if check fails

# ✅ Track Whales Function
def track_whales(token_address):
    """
    Checks if a single wallet holds more than 20% of the token supply (potential whale).
    Returns True if whale detected, False otherwise.
    """
    log_event(f"🐋 Checking for whales in {token_address}...")

    token_contract = w3.eth.contract(address=w3.to_checksum_address(token_address), abi=TOKEN_ABI)

    try:
        total_supply = token_contract.functions.totalSupply().call()
        if total_supply == 0:
            log_event(f"⚠️ Total supply is zero for {token_address}. Assuming no whales.")
            return False
            
        # Check deployer balance
        deployer_address = get_deployer_address(token_address)
        if deployer_address:
            balance = token_contract.functions.balanceOf(deployer_address).call()
            if balance / total_supply > 0.20:  # More than 20% supply held
                log_event(f"🚨 Whale Detected! Deployer {deployer_address} holds {balance / total_supply:.2%} of total supply.")
                return True
                
        # Check contract's own balance (could indicate locked tokens)
        balance = token_contract.functions.balanceOf(token_address).call()
        if balance / total_supply > 0.20:
            log_event(f"🚨 Whale Detected! Contract holds {balance / total_supply:.2%} of total supply.")
            return True
            
        return False  # No whale activity detected
        
    except Exception as e:
        log_event(f"❌ Whale Check Failed: {str(e)}")
        return False  # Assume safe if check fails

# ✅ Honeypot Check Function
def is_honeypot(token_address):
    """
    Checks if the token is a honeypot (i.e., cannot be sold).
    Returns True if honeypot detected, False otherwise.
    """
    log_event(f"🔍 Checking if {token_address} is a honeypot...")

    token_contract = w3.eth.contract(address=w3.to_checksum_address(token_address), abi=TOKEN_ABI)

    try:
        # Use a dead wallet for testing
        test_wallet = "0x000000000000000000000000000000000000dEaD"
        
        # Some contracts revert approval transactions – Catch and continue
        try:
            # Try to call approve (not execute a transaction)
            approval = token_contract.functions.approve(test_wallet, 1).call({
                "from": wallet_address
            })
            
            if not approval and approval is not None:
                log_event(f"🚨 Honeypot Detected! {token_address} does not allow approvals.")
                return True
        except Exception as e:
            # If approval fails, check if the error is suspicious
            error_str = str(e).lower()
            if "revert" in error_str and ("blacklist" in error_str or "block" in error_str):
                log_event(f"🚨 Honeypot Detected! {token_address} has blacklist functionality.")
                return True
            
            log_event(f"⚠️ Approval call reverted for {token_address}. This could be normal behavior.")
        
        # Check if the token has a suspicious name or symbol
        token_info = get_token_info(token_address)
        suspicious_terms = ["honeypot", "scam", "fake", "ponzi", "rug"]
        for term in suspicious_terms:
            if term in token_info["name"].lower() or term in token_info["symbol"].lower():
                log_event(f"🚨 Suspicious token name/symbol detected! {token_info['name']} ({token_info['symbol']})")
                return True
        
        return False  # Passed honeypot checks
        
    except Exception as e:
        log_event(f"❌ Honeypot check failed: {str(e)}")
        return True  # Assume it's a honeypot if check fails (safer)

# ✅ Get Current Price Function
def get_current_price(token_address):
    """
    Fetches the current price of a token from PancakeSwap Router.
    Returns the price in BNB, or None if fetch fails.
    """
    try:
        path = [
            WBNB_ADDRESS,
            w3.to_checksum_address(token_address)
        ]
        # Get price for 1 BNB worth of tokens
        price = router.functions.getAmountsOut(Web3.to_wei(1, "ether"), path).call()
        token_price = price[1] / 10**18  # Convert from Wei to tokens
        log_event(f"✅ Price of {token_address}: {token_price} tokens per BNB")
        return token_price
    except Exception as e:
        log_event(f"❌ Failed to fetch price for {token_address}: {str(e)}")
        return None

# ✅ Buy Token Function
def buy_token(token_address):
    """
    Buys a token on PancakeSwap after passing all security checks.
    Returns a dictionary with trade information if successful, None otherwise.
    """
    log_event(f"💰 Preparing to buy {token_address}...")
    
    # All security checks should be done before calling this function
    
    # Get token info for better logging
    token_info = get_token_info(token_address)
    log_event(f"🪙 Token: {token_info['name']} ({token_info['symbol']})")
    
    # Approval - If this fails, buying will likely fail too
    if not approve_token(token_address):
        log_event(f"⚠️ Approval failed, attempting to buy without approval.")
    
    # Set Trading Parameters
    bnb_amount = Web3.to_wei(0.1, "ether")  # 0.05 BNB per trade
    slippage_tolerance = 0.07  # 7% slippage tolerance
    
    # Get expected tokens out
    path = [
        WBNB_ADDRESS,
        w3.to_checksum_address(token_address)
    ]
    
    try:
        # Get expected output first
        amounts_out = router.functions.getAmountsOut(bnb_amount, path).call()
        expected_out = amounts_out[1]
        
        # Apply slippage tolerance
        amount_out_min = int(expected_out * (1 - slippage_tolerance))
        
        log_event(f"📊 Expected to receive at least {amount_out_min / 10**token_info['decimals']} {token_info['symbol']} tokens")
        
        # Set deadline
        deadline = int(time.time()) + 600  # 10 minutes
        
        # Fetch Gas Price
        gas_price = int(w3.eth.gas_price * 1.2)  # 20% increase for priority
        
        # Build transaction
        txn = router.functions.swapExactETHForTokens(
            amount_out_min,  # Minimum tokens to receive
            path,  # Token path [WBNB, TOKEN]
            wallet_address,  # Receiver address
            deadline  # Transaction deadline
        ).build_transaction({
            "from": wallet_address,
            "value": bnb_amount,  # BNB amount
            "gas": 300000,
            "gasPrice": gas_price,
            "nonce": w3.eth.get_transaction_count(wallet_address)
        })
        
        # Sign and send transaction
        signed_txn = w3.eth.account.sign_transaction(txn, PRIVATE_KEY)
        txn_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        log_event(f"✅ Buy TXN Submitted: {txn_hash.hex()}")
        
        # Wait for transaction receipt
        buy_status = wait_for_transaction_receipt(txn_hash)
        
        if buy_status:
            log_event(f"✅ Successfully bought {token_address}")
            
            # Send notification
            send_trade_notification("buy", token_info, bnb_amount / 10**18)
            
            # Return trade info for monitoring
            return {
                "address": token_address,
                "name": token_info["name"],
                "symbol": token_info["symbol"],
                "buy_price": bnb_amount,
                "buy_time": int(time.time()),
                "stop_loss": bnb_amount * 0.85,  # 15% stop loss
                "take_profit_1": bnb_amount * 1.5,  # 50% profit target
                "take_profit_2": bnb_amount * 2.0,  # 100% profit target
                "bnb_amount": bnb_amount,
                "expected_tokens": expected_out,
            }
        else:
            log_event(f"❌ Buy transaction failed or timed out for {token_address}")
            return None
        
    except Exception as e:
        log_event(f"❌ Buy Failed: {str(e)}")
        return None

# ✅ Sell Token Function
def sell_token(token_address, percentage, trade_info=None):
    """
    Sells a percentage of tokens on PancakeSwap.
    Returns True if successful, False otherwise.
    """
    log_event(f"✅ Selling {percentage}% of {token_address} on PancakeSwap...")
    
    # Get token info
    token_info = get_token_info(token_address)

    try:
        # Get token contract
        token_contract = w3.eth.contract(address=w3.to_checksum_address(token_address), abi=TOKEN_ABI)
        
        # Get actual token balance
        token_balance = token_contract.functions.balanceOf(wallet_address).call()
        if token_balance == 0:
            log_event(f"❌ No tokens to sell for {token_address}. Skipping...")
            return False
            
        # Calculate amount to sell based on percentage
        amount_to_sell = int(token_balance * (percentage / 100))
        log_event(f"🔢 Selling {amount_to_sell / 10**token_info['decimals']} of {token_balance / 10**token_info['decimals']} total tokens")
        
        # Ensure token is approved for router
        if not approve_token(token_address):
            log_event(f"❌ Approval failed for selling {token_address}. Aborting sell...")
            return False
        
        # Set up swap parameters
        path = [
            w3.to_checksum_address(token_address),  # Token we're selling
            WBNB_ADDRESS  # WBNB
        ]
        
        # Get minimum amount out with slippage
        slippage_tolerance = 0.07  # 7% slippage
        
        try:
            expected_out = router.functions.getAmountsOut(amount_to_sell, path).call()
            amount_out_min = int(expected_out[1] * (1 - slippage_tolerance))
        except Exception as e:
            log_event(f"⚠️ Error estimating output amount: {str(e)}. Setting minimum output to 0.")
            amount_out_min = 0
        
        # Set deadline
        deadline = int(time.time()) + 600  # 10 minutes
        
        # Build and send transaction
        txn = router.functions.swapExactTokensForETH(
            amount_to_sell,
            amount_out_min,
            path,
            wallet_address,
            deadline
        ).build_transaction({
            "from": wallet_address,
            "gas": 300000,
            "gasPrice": int(w3.eth.gas_price * 1.2),  # 20% increase for priority
            "nonce": w3.eth.get_transaction_count(wallet_address)
        })
        
        signed_txn = w3.eth.account.sign_transaction(txn, PRIVATE_KEY)
        txn_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        log_event(f"✅ Sell TXN Submitted: {txn_hash.hex()}")
        
        # Wait for transaction receipt
        sell_status = wait_for_transaction_receipt(txn_hash)
        
        if sell_status:
            log_event(f"✅ Successfully sold {percentage}% of {token_info['symbol']}")
            
            # Calculate profit/loss if we have trade_info
            profit_loss = None
            if trade_info and 'bnb_amount' in trade_info and expected_out[1] > 0:
                initial_value = trade_info['bnb_amount']
                current_value = expected_out[1]  # Amount of BNB received
                profit_loss = ((current_value - initial_value) / initial_value) * 100
                log_event(f"📊 P&L: {profit_loss:.2f}%")
            
            # Send notification
            send_trade_notification("sell", token_info, percentage, None, profit_loss)
            
            return True
        else:
            log_event(f"❌ Sell transaction failed or timed out for {token_address}")
            return False
        
    except Exception as e:
        log_event(f"❌ Sell Failed: {str(e)}")
        return False

# ✅ Monitor & Sell Tokens
def monitor_and_sell(trade):
    """
    Monitors a trade and sells based on conditions.
    Returns True if sold, False if still monitoring.
    """
    token_address = trade['address']
    log_event(f"📈 Monitoring {trade['symbol']} ({token_address}) for sell conditions...")
    
    # Fetch Current Price
    try:
        # Get token balance first
        token_contract = w3.eth.contract(address=w3.to_checksum_address(token_address), abi=TOKEN_ABI)
        token_balance = token_contract.functions.balanceOf(wallet_address).call()
        
        if token_balance == 0:
            log_event(f"❌ No tokens to sell for {trade['symbol']}. Removing from monitoring.")
            return True  # Return True to remove from monitoring
        
        # Get current value in BNB
        path = [
            w3.to_checksum_address(token_address),
            WBNB_ADDRESS
        ]
        
        current_value_wei = router.functions.getAmountsOut(token_balance, path).call()[1]
        current_value = current_value_wei
        
        # Convert to readable
        current_value_bnb = current_value / 10**18
        
        # Log current values
        buy_price_bnb = trade['bnb_amount'] / 10**18
        stop_loss_bnb = trade['stop_loss'] / 10**18
        take_profit_1_bnb = trade['take_profit_1'] / 10**18
        take_profit_2_bnb = trade['take_profit_2'] / 10**18
        
        log_event(f"💰 Current Value: {current_value_bnb:.4f} BNB | 📉 Stop-Loss: {stop_loss_bnb:.4f} BNB | 📈 TP1: {take_profit_1_bnb:.4f} BNB | 🚀 TP2: {take_profit_2_bnb:.4f} BNB")
        
        # Calculate time held
        time_held = int(time.time()) - trade['buy_time']
        hours_held = time_held / 3600
        log_event(f"⏱️ Time held: {hours_held:.2f} hours")
        
        # Check sell conditions
        
        # 1. Stop-Loss (-15%)
        if current_value <= trade["stop_loss"]:
            log_event(f"🚨 Stop-Loss Triggered! Selling {trade['symbol']} at a loss.")
            return sell_token(token_address, 100, trade)
            
        # 2. Take-Profit 1 (+50%) - Sell half
        if current_value >= trade["take_profit_1"] and current_value < trade["take_profit_2"]:
            log_event(f"✅ Take-Profit 1 Triggered! Selling 50% of {trade['symbol']} at +50% profit.")
            return sell_token(token_address, 50, trade)
            
        # 3. Take-Profit 2 (+100%) - Sell all
        if current_value >= trade["take_profit_2"]:
            log_event(f"🚀 Take-Profit 2 Triggered! Selling 100% of {trade['symbol']} at +100% profit.")
            return sell_token(token_address, 100, trade)
            
        # 4. Time-based exit (after 24 hours, sell 100%)
        if hours_held >= 24:
            log_event(f"⏰ Time-based exit triggered! Selling 100% of {trade['symbol']} after 24 hours.")
            return sell_token(token_address, 100, trade)
            
        return False  # Continue monitoring
        
    except Exception as e:
        log_event(f"❌ Error monitoring {token_address}: {str(e)}")
        return False  # Continue monitoring despite error


import streamlit as st
import pandas as pd
import sqlite3
import matplotlib.pyplot as plt

# Connect to the database
conn = sqlite3.connect('finance_data.db')
query = 'SELECT * FROM transactions'
df = pd.read_sql_query(query, conn)

# Streamlit App
st.title('Personal Finance Dashboard')

# Display Data
st.subheader('All Transactions')
st.write(df)

# Filter by Date
st.sidebar.header('Filter Transactions')
start_date = st.sidebar.date_input('Start Date', df['Date'].min())
end_date = st.sidebar.date_input('End Date', df['Date'].max())

filtered_df = df[(df['Date'] >= str(start_date)) & (df['Date'] <= str(end_date))]

# Monthly Cash Flow
st.subheader('Monthly Cash Flow')
cash_flow = filtered_df.groupby(filtered_df['Date'].str[:7]).sum()
st.line_chart(cash_flow['Amount'])

# Spending by Category
st.subheader('Spending by Category')
category_spending = filtered_df.groupby('Category')['Amount'].sum()
fig, ax = plt.subplots()
ax.pie(category_spending, labels=category_spending.index, autopct='%1.1f%%')
st.pyplot(fig)

# Account Balances
st.subheader('Account Balances')
account_balance = filtered_df.groupby('Account')['Amount'].sum()
st.bar_chart(account_balance)

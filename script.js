import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX1TENY5wFyLxOdzbSOVO08upYe23mHBQ",
  authDomain: "billing-database-d9d47.firebaseapp.com",
  projectId: "billing-database-d9d47",
  storageBucket: "billing-database-d9d47.appspot.com",
  messagingSenderId: "274913121006",
  appId: "1:274913121006:web:1d960cd26e40b75af059ff",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Reference to the transactions collection
const transactionsRef = collection(db, "transactions");

// DOM Elements
const transactionForm = document.getElementById("transaction-form");
const transactionTableBody = document.querySelector("#transaction-table tbody");
const transactionModal = document.getElementById("transactionModal");
const modalClose = document.querySelector(".close");
const printDetailsButton = document.getElementById("printDetails");

// GST Calculation
const amountInput = document.getElementById("amount");
const gstPercentageInput = document.getElementById("gstPercentage");
const gstCostInput = document.getElementById("gstCost");

gstPercentageInput.addEventListener("input", () => {
  const amount = parseFloat(amountInput.value) || 0;
  const gstPercentage = parseFloat(gstPercentageInput.value) || 0;
  const gstCost = (amount * gstPercentage) / 100;
  gstCostInput.value = gstCost.toFixed(2);
});

// Add Transaction
transactionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(transactionForm);
  const newTransaction = {
    billId: formData.get("billId"),
    customerName: formData.get("customerName"),
    date: formData.get("date"),
    amount: parseFloat(formData.get("amount")),
    gstPercentage: parseFloat(formData.get("gstPercentage")),
    gstCost: parseFloat(formData.get("gstCost")),
    paymentMethod: formData.get("paymentMethod"),
    phoneNumber: formData.get("phoneNumber"),
    productName: formData.get("productName"),
    createdAt: new Date().toISOString(),
  };

  try {
    await addDoc(transactionsRef, newTransaction);
    alert("Transaction added successfully!");
    transactionForm.reset();
    fetchTransactions(); // Refresh table
  } catch (error) {
    console.error("Error adding transaction:", error);
  }
});

// Search Transactions by Any Field
const searchKeyInput = document.getElementById("searchKey");
const searchButton = document.getElementById("searchButton");

searchButton.addEventListener("click", async () => {
  const searchKey = searchKeyInput.value.trim().toLowerCase();

  if (!searchKey) {
    alert("Please enter a search keyword.");
    return;
  }

  try {
    const q = query(transactionsRef); // Fetch all transactions
    const querySnapshot = await getDocs(q);

    const filteredTransactions = [];
    querySnapshot.forEach((doc) => {
      const transaction = { id: doc.id, ...doc.data() };

      // Check if any field contains the search keyword
      if (
        (transaction.billId && transaction.billId.toLowerCase().includes(searchKey)) ||
        (transaction.customerName && transaction.customerName.toLowerCase().includes(searchKey)) ||
        (transaction.phoneNumber && transaction.phoneNumber.toLowerCase().includes(searchKey)) ||
        (transaction.date && transaction.date.toLowerCase().includes(searchKey)) ||
        (transaction.productName && transaction.productName.toLowerCase().includes(searchKey)) ||
        (transaction.paymentMethod && transaction.paymentMethod.toLowerCase().includes(searchKey)) ||
        (transaction.amount && transaction.amount.toString().toLowerCase().includes(searchKey)) ||
        (transaction.gstCost && transaction.gstCost.toString().toLowerCase().includes(searchKey))
      ) {
        filteredTransactions.push(transaction);
      }
    });

    if (filteredTransactions.length > 0) {
      displayTransactions(filteredTransactions); // Show filtered transactions
      attachRowClickListeners(filteredTransactions); // Attach row click listeners for search results
    } else {
      alert("No transactions found matching the search criteria.");
      displayTransactions([]); // Clear table if no matches
    }
  } catch (error) {
    console.error("Error searching transactions:", error);
  }
});


// Fetch Transactions
async function fetchTransactions() {
  try {
    const q = query(transactionsRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    displayTransactions(transactions);
    attachRowClickListeners(transactions); // Attach row click listeners
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

function displayTransactions(data) {
  transactionTableBody.innerHTML = "";

  data.forEach((transaction) => {
    const row = document.createElement("tr");

    let paymentCellContent;
    if (transaction.paymentMethod === "Credit") {
      // Dropdown for Credit transactions
      paymentCellContent = `
        <select class="update-payment-method" data-id="${transaction.id}">
          <option value="">Credit</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="UPI">UPI</option>
        </select>
      `;
    } else {
      // Plain text for updated transactions
      paymentCellContent = `${transaction.paymentMethod}`;
    }

    row.innerHTML = `
      <td>${transaction.billId}</td>
      <td>${transaction.customerName}</td>
      <td>${transaction.phoneNumber}</td>
      <td>${transaction.date}</td>
      <td>${transaction.productName}</td>
      <td>${paymentCellContent}</td>
      <td>₹${transaction.amount.toFixed(2)}</td>
      <td>₹${transaction.gstCost.toFixed(2)}</td>
    `;

    transactionTableBody.appendChild(row);
  });

  // Attach event listeners to dropdowns
  attachDropdownListeners();
}

function attachDropdownListeners() {
  const dropdowns = document.querySelectorAll(".update-payment-method");

  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("change", async (e) => {
      const newMethod = e.target.value;
      const transactionId = e.target.dataset.id;

      if (newMethod) {
        try {
          // Update the Firestore document with the new payment method
          const transactionDoc = doc(db, "transactions", transactionId);
          await updateDoc(transactionDoc, { paymentMethod: newMethod });

          alert("Payment method updated successfully!");

          // Refresh the table to remove the dropdown
          fetchTransactions();
        } catch (error) {
          console.error("Error updating payment method:", error);
          alert("Failed to update payment method.");
        }
      }
    });
  });
}


// Attach Click Event to Table Rows
function attachRowClickListeners(transactions) {
  transactionTableBody.querySelectorAll("tr").forEach((row, index) => {
    row.addEventListener("click", () => {
      openModal(transactions[index]);
    });
  });
}

// Open Modal
function openModal(transaction) {
  document.getElementById("modalBillId").textContent = transaction.billId;
  document.getElementById("modalCustomerName").textContent = transaction.customerName;
  document.getElementById("modalDate").textContent = transaction.date;
  document.getElementById("modalAmount").textContent = `${transaction.amount.toFixed(2)}`;
  document.getElementById("modalPaymentMethod").textContent = transaction.paymentMethod;
  document.getElementById("modalPhoneNumber").textContent = transaction.phoneNumber;
  document.getElementById("modalProductName").textContent = transaction.productName;
  document.getElementById("modalGstCost").textContent = `${transaction.gstCost.toFixed(2)}`;

  transactionModal.style.display = "block";
}

// Close Modal
modalClose.addEventListener("click", () => {
  transactionModal.style.display = "none";
});

// Print Full Table
document.getElementById("printTable").addEventListener("click", () => {
  const tableContent = document.getElementById("transaction-table").outerHTML;
  const printWindow = window.open("", "", "width=800,height=600");
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Transactions</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          table, th, td {
            border: 1px solid #ccc;
          }
          th {
            background-color: #f4f4f4;
            text-align: left;
            padding: 8px;
          }
          td {
            padding: 8px;
          }
          h1 {
            text-align: center;
            color: #333;
          }
        </style>
      </head>
      <body>
        <h1>All Transactions</h1>
        ${tableContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
});

// Print Single Transaction
document.getElementById("printDetails").addEventListener("click", () => {
  const modalDetails = {
    billId: document.getElementById("modalBillId").textContent,
    customerName: document.getElementById("modalCustomerName").textContent,
    date: document.getElementById("modalDate").textContent,
    amount: document.getElementById("modalAmount").textContent,
    paymentMethod: document.getElementById("modalPaymentMethod").textContent,
    phoneNumber: document.getElementById("modalPhoneNumber").textContent,
    productName: document.getElementById("modalProductName").textContent,
    gstCost: document.getElementById("modalGstCost").textContent,
  };

  const printWindow = window.open("", "", "width=800,height=600");
  printWindow.document.write(`
<html>
  <head>
    <title>Print Transaction</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
      }
      .bill-container {
        border: 1px solid #ccc;
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
        background-color: #f9f9f9;
      }
      .bill-header {
        text-align: center;
        margin-bottom: 20px;
      }
      .bill-header h1 {
        margin: 0;
        font-size: 24px;
        color: #204051;
      }
      .bill-header p {
        margin: 5px 0;
        color: #555;
      }
      .customer-details {
        margin-bottom: 20px;
      }
      .customer-details p {
        margin: 5px 0;
        font-size: 16px;
      }
      .transaction-details {
        margin-top: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 8px;
        text-align: left;
        font-size: 14px;
      }
      th {
        background-color: #f0f0f0;
        color: #333;
      }
      .bill-footer {
        text-align: center;
        margin-top: 20px;
        font-size: 14px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <div class="bill-container">
      <!-- Bill Header -->
      <div class="bill-header">
        <h1>Mahalaxmi Agency</h1>
        <p>GST Number: 29XXXXXXXXXXXXX</p>
        <p>Address: 123, Main Street, Near Market, City, State - 560001</p>
      </div>

      <!-- Customer Details -->
      <div class="customer-details">
        <p><strong>Customer Name:</strong> ${modalDetails.customerName}</p>
        <p><strong>Phone Number:</strong> ${modalDetails.phoneNumber}</p>
        <p><strong>Date:</strong> ${modalDetails.date}</p>
      </div>

      <!-- Transaction Details -->
      <div class="transaction-details">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bill ID</td>
              <td>${modalDetails.billId}</td>
            </tr>
            <tr>
              <td>Product Name</td>
              <td>${modalDetails.productName}</td>
            </tr>
            <tr>
              <td>Payment Method</td>
              <td>${modalDetails.paymentMethod}</td>
            </tr>
            <tr>
              <td>Amount</td>
              <td id="amount">${modalDetails.amount}</td>
            </tr>
            <tr>
              <td>GST Cost</td>
              <td id="gstCost">${modalDetails.gstCost}</td>
            </tr>
            <tr>
              <td>Total Amount</td>
              <td id="totalAmount">Calculating...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bill Footer -->
      <div class="bill-footer">
        <p>Thank you for visiting our business!</p>
        <p>Visit Again</p>
        <p>Billing Made By: <b>Mahalaxmi Agency Billing</b></p>
      </div>
    </div>

    <script>
        // Debugging: Check values from modalDetails
        console.log("Amount: ", "${modalDetails.amount}");
        console.log("GST Cost: ", "${modalDetails.gstCost}");
  
        // Parse the values to float, if they are valid numbers
        const amount = parseFloat("${modalDetails.amount}");
        const gstCost = parseFloat("${modalDetails.gstCost}");
  
        console.log("Parsed Amount: ", amount);
        console.log("Parsed GST Cost: ", gstCost);
  
        // Check for invalid values
        if (isNaN(amount) || isNaN(gstCost)) {
          console.error("Error: Invalid amount or GST cost");
          document.getElementById("totalAmount").textContent = "Error: Invalid amount or GST cost";
        } else {
          // Calculate total amount
          const totalAmount = (amount + gstCost).toFixed(2);
          console.log("Total Amount: ", totalAmount);
  
          // Update the Total Amount in the table
          document.getElementById("totalAmount").textContent = totalAmount;
        }
  </script>
  </body>
</html>


  `);
  printWindow.document.close();
  printWindow.print();
});


// Initial Fetch
fetchTransactions();

const Validator = require('jsonschema').Validator;
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const PORT = 3000;

const v = new Validator();

Validator.prototype.customFormats.notEmptyString = function(input) {
    return input.length;
}

Validator.prototype.customFormats.notNaN = function(input) {
    return input != NaN;
}

const invoice_schema = {
    "id": "/Invoice",
    "type": "object",
    "properties": {
        "invoiceNumber": {"type": "string", "format": "notEmptyString"},
        "customerName": {"type": "string", "format": "notEmptyString"},
        "amount": {"type": "number", "format": "notNaN"},
        "payments": {
            "type": "array",
            "items": {"$ref": "/Payment"}
        }
    },
    "required": ["invoiceNumber", "customerName", "amount", "payments"]
}

const payment_schema = {
    "id": "/Payment",
    "type": "object",
    "properties": {
        "paymentNumber": {"type": "string", "format": "notEmptyString"},
        "amount": {"type": "number", "format": "notNaN"}
    },
    "required": ["paymentNumber", "amount"]
}

v.addSchema(payment_schema, '/Payment');
v.addSchema(invoice_schema, '/Invoice');

var invoices = [{
    "invoiceNumber": "1",
    "customerName": "Dave",
    "amount": 40.0,
    "payments": [{
        "paymentNumber": "1",
        "amount": 20.0
    }, {
        "paymentNumber": "2",
        "amount": 10.0
    }]
}, {
    "invoiceNumber": "2",
    "customerName": "Josh",
    "amount": 40.0,
    "payments": []
}, {
    "invoiceNumber": "3",
    "customerName": "Dave",
    "amount": 40.0,
    "payments": [{
        "paymentNumber": "3",
        "amount": 20.0
    }, {
        "paymentNumber": "4",
        "amount": 10.0
    }]
}];

var jsonParser = bodyParser.json();

function calculateAmountDifference(amount, payments) {
    var total = 0;
    for (let index in payments) {
        let payment = payments[index];
        total += payment.amount;
    }
    return amount - total;
}

function getOutstandingPayments() {
    let results = {};
    for (let index in invoices) {
        let invoice = invoices[index];
        console.log(invoice);
        var invoice_difference = calculateAmountDifference(invoice.amount, invoice.payments);
        if(invoice.customerName in results) {
            results[invoice.customerName] += invoice_difference;
        } else {
            results[invoice.customerName] = invoice_difference;
        }
    }
    return results;
}

function convertDictToOutput() {
    let results = [];
    let dict_values = getOutstandingPayments();
    console.log(dict_values);
    for (let key in dict_values) {
        if(dict_values.hasOwnProperty(key)) {
            results.push({
                "customerName": key,
                "amountOutstanding": parseFloat(dict_values[key])
            });
        }
    }
    return results;
}

// Payments comes through as an array
app.post("/sendInvoice", jsonParser, (req, res) => {
    const isValidInvoice = v.validate(req.body, invoice_schema, { allowUnknownAttributes: false }).valid;
    console.log(isValidInvoice);
    if (isValidInvoice) {
        invoices.push(req.body);
        res.status(200);
        res.send("Success");
    } else {
        res.status(400);
        res.send("Invoice did not pass validation!");
    }
});

app.get("/getReports", (req, res) => {
    let results_array = convertDictToOutput();
    const filtered_results = results_array.filter(result => result.amountOutstanding > 0);
    res.status(200);
    res.json(filtered_results);
});

app.listen(PORT, () => console.log(`Listening on Port: ${PORT}`));
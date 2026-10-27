const API_URL = "/invoices";

let currentInvoiceId = null;
let originalInvoice = null;

const uploadForm = document.getElementById("upload-form");
const searchForm = document.getElementById("search-form");
const invoiceForm = document.getElementById("invoice-form");
const message = document.getElementById("message");

const fields = {
    company_name: "company-name",
    invoice_number: "invoice-number",
    invoice_date: "invoice-date",
    currency: "currency",
    subtotal: "subtotal",
    tax_amount: "tax-amount",
    total_amount: "total-amount"
};


// Ekranda işlem veya hata mesajı gösterir.
function showMessage(text, type = "") {
    message.textContent = text;
    message.className = type;
}


// Backend'e istek gönderir ve hataları kontrol eder.
async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        let errorMessage = "İşlem gerçekleştirilemedi.";

        if (typeof data.detail === "string") {
            errorMessage = data.detail;
        } else if (data.detail?.message) {
            errorMessage = data.detail.message;

            if (data.detail.warnings?.length) {
                errorMessage += " " + data.detail.warnings.join(" ");
            }
        } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail
                .map(error => error.msg)
                .join(" ");
        }

        throw new Error(errorMessage);
    }

    return data;
}


// Fatura bilgilerini ekrana yerleştirir.
// POST/PATCH iç içe, GET düz JSON döndürüyor.
function showInvoice(data) {
    const invoice = data.invoice ?? data;

    currentInvoiceId = data.id;
    originalInvoice = {};

    document.getElementById("invoice-id").textContent = data.id;

    const status = document.getElementById("approval-status");

    const statusLabels = {
        pending: "Onay bekliyor",
        approved: "Onaylandı",
        rejected: "Reddedildi"
    };

    status.textContent =
        statusLabels[data.approval_status] ?? data.approval_status;

    status.className = data.approval_status;

    for (const [field, elementId] of Object.entries(fields)) {
        const value = String(invoice[field] ?? "");

        document.getElementById(elementId).value = value;
        originalInvoice[field] = value;
    }

    const warningsList = document.getElementById("warnings-list");
    warningsList.replaceChildren();

    const warnings = data.warnings ?? [];

    if (warnings.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Kontrollerde uyarı bulunmadı.";
        warningsList.appendChild(item);
    } else {
        for (const warning of warnings) {
            const item = document.createElement("li");
            item.textContent = warning;
            warningsList.appendChild(item);
        }
    }

    document.getElementById("export-button").disabled =
        data.approval_status !== "approved";

    document.getElementById("invoice-section").hidden = false;
}


// Kullanıcının değiştirdiği alanları toplar.
function getChanges() {
    const changes = {};

    for (const [field, elementId] of Object.entries(fields)) {
        const value = document.getElementById(elementId).value;

        if (value !== originalInvoice[field]) {
            changes[field] = value === "" ? null : value;
        }
    }

    return changes;
}


// PDF yükleme
uploadForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = document.getElementById("invoice-file").files[0];

    if (!file) {
        showMessage("Önce bir PDF seç.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const button = document.getElementById("upload-button");
    button.disabled = true;

    showMessage("Fatura okunuyor, lütfen bekle…");

    try {
        const data = await apiRequest(API_URL, {
            method: "POST",
            body: formData
        });

        showInvoice(data);
        showMessage("Fatura okundu ve kaydedildi.", "success");
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        button.disabled = false;
    }
});


// ID ile kayıtlı faturayı getirme
searchForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = document.getElementById("search-id").value;

    showMessage("Fatura getiriliyor…");

    try {
        const data = await apiRequest(`${API_URL}/${id}`);

        showInvoice(data);
        showMessage("Fatura getirildi.", "success");
    } catch (error) {
        showMessage(error.message, "error");
    }
});


// Değişiklikleri kaydetme
invoiceForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (currentInvoiceId === null) {
        return;
    }

    const changes = getChanges();

    if (Object.keys(changes).length === 0) {
        showMessage("Henüz bir alanı değiştirmedin.");
        return;
    }

    const button = document.getElementById("save-button");
    button.disabled = true;

    showMessage("Değişiklikler kaydediliyor…");

    try {
        const data = await apiRequest(
            `${API_URL}/${currentInvoiceId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(changes)
            }
        );

        showInvoice(data);
        showMessage("Değişiklikler kaydedildi.", "success");
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        button.disabled = false;
    }
});


// Onaylama veya reddetme
async function changeApprovalStatus(approvalStatus) {
    if (currentInvoiceId === null) {
        return;
    }

    if (Object.keys(getChanges()).length > 0) {
        showMessage(
            "Önce yaptığın değişiklikleri kaydet.",
            "error"
        );
        return;
    }

    const approveButton = document.getElementById("approve-button");
    const rejectButton = document.getElementById("reject-button");

    approveButton.disabled = true;
    rejectButton.disabled = true;

    showMessage("Onay durumu güncelleniyor…");

    try {
        const data = await apiRequest(
            `${API_URL}/${currentInvoiceId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    approval_status: approvalStatus
                })
            }
        );

        showInvoice(data);

        showMessage(
            approvalStatus === "approved"
                ? "Fatura onaylandı."
                : "Fatura reddedildi.",
            "success"
        );
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        approveButton.disabled = false;
        rejectButton.disabled = false;
    }
}

document.getElementById("approve-button")
    .addEventListener("click", function () {
        changeApprovalStatus("approved");
    });

document.getElementById("reject-button")
    .addEventListener("click", function () {
        changeApprovalStatus("rejected");
    });


// Muhasebe aktarımını deneme
document.getElementById("export-button")
    .addEventListener("click", async function () {
        if (currentInvoiceId === null) {
            return;
        }

        if (Object.keys(getChanges()).length > 0) {
            showMessage(
                "Önce yaptığın değişiklikleri kaydet.",
                "error"
            );
            return;
        }

        const button = document.getElementById("export-button");
        button.disabled = true;

        showMessage("Aktarım uygunluğu kontrol ediliyor…");

        try {
            const data = await apiRequest(
                `${API_URL}/${currentInvoiceId}/export`,
                {
                    method: "POST"
                }
            );

            showMessage(data.message, "success");
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            button.disabled = false;
        }
    });
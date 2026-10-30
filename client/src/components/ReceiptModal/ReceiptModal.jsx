import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ImageIcon from "@mui/icons-material/Image";
import CloseIcon from "@mui/icons-material/Close";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { formatDate } from "../../utils/dateFormat";
import { toast } from "react-toastify";

import { colors } from "../../styles/theme";
import { receiptStyles } from "./receiptStyles";
import { SmallMobileView } from "../../styles/theme";
const FALLBACK_WHATSAPP_NUMBER = "03172662943";

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  const isAppleTouch =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return isAppleTouch;
};

const resolveWhatsAppNumber = (rawPhone) => {
  const digitsOnly = (rawPhone || "").replace(/\D/g, "");
  const isUsable = (num) => {
    if (!num) return false;
    let n = num;
    if (n.startsWith("0092")) n = n.slice(4);
    else if (n.startsWith("92")) n = n.slice(2);
    else if (n.startsWith("0")) n = n.slice(1);
    return n.length >= 10;
  };

  const source = isUsable(digitsOnly) ? digitsOnly : FALLBACK_WHATSAPP_NUMBER;
  const cleaned = isUsable(digitsOnly)
    ? digitsOnly
    : FALLBACK_WHATSAPP_NUMBER.replace(/\D/g, "");

  let normalized = cleaned;
  if (normalized.startsWith("0092")) normalized = normalized.slice(4);
  else if (normalized.startsWith("92")) normalized = normalized.slice(2);
  else if (normalized.startsWith("0")) normalized = normalized.slice(1);

  return `92${normalized}`;
};
const captureReceiptCanvas = async (node) => {
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const fullWidth = Math.max(node.scrollWidth, node.offsetWidth);
  const fullHeight = Math.max(node.scrollHeight, node.offsetHeight);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: fullWidth,
    height: fullHeight,
    windowWidth: fullWidth,
    windowHeight: fullHeight,
    scrollX: 0,
    scrollY: 0,
  });

  return canvas;
};

const canvasToBlob = (canvas, type = "image/png", quality = 1) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const buildPdfFromCanvas = (canvas, refValue) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgWidthMm = usableWidth;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  if (imgHeightMm <= usableHeight) {
    const imgData = canvas.toDataURL("image/png", 1.0);
    pdf.addImage(imgData, "PNG", margin, margin, imgWidthMm, imgHeightMm);
  } else {
    const pageHeightPx = (usableHeight * canvas.width) / imgWidthMm;
    let renderedHeightPx = 0;
    let pageIndex = 0;

    while (renderedHeightPx < canvas.height) {
      const sliceHeightPx = Math.min(
        pageHeightPx,
        canvas.height - renderedHeightPx
      );

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        renderedHeightPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      const sliceImgData = pageCanvas.toDataURL("image/png", 1.0);
      const sliceHeightMm = (sliceHeightPx * imgWidthMm) / canvas.width;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        sliceImgData,
        "PNG",
        margin,
        margin,
        imgWidthMm,
        sliceHeightMm
      );

      renderedHeightPx += sliceHeightPx;
      pageIndex += 1;
    }
  }

  pdf.save(`Receipt_${refValue || "Doc"}.pdf`);
};

const ReceiptModal = ({ open, onClose, data, type = "sale" }) => {
  const styles = receiptStyles();
  const receiptRef = useRef();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const mobileView = useMediaQuery(SmallMobileView);

  if (!data) return null;

  let title = "Official Receipt";
  let refLabel = "Ref #";
  let refValue = "";
  let partyLabel = "Party Details";
  let partyName = "";
  let partyPhone = "";
  let partyAddress = "";
  let dateValue = formatDate(new Date());
  let status = "paid";
  let totalAmount = 0;
  let paidAmount = 0;
  let remainingAmount = 0;
  let paymentMethod = "Cash";

  if (type === "sale") {
    title = "Sales Invoice Receipt";
    refLabel = "Bill #";
    refValue = data.billNumber || "N/A";
    partyLabel = "Customer / Buyer";
    partyName = data.buyerId?.name || data.buyer?.name || "Customer";
    partyPhone = data.buyerId?.phone || data.buyer?.phone || "";
    partyAddress = data.buyerId?.address || data.buyer?.address || "";
    dateValue = data.date ? formatDate(data.date) : dateValue;
    status = data.status || "unpaid";
    totalAmount = Number(data.totalAmount || 0);
    paidAmount = Number(data.paidAmount || 0);
    remainingAmount = Number(data.remainingAmount || 0);
    paymentMethod = data.paymentType || "Cash";
  } else if (type === "stock") {
    title = "Purchase Voucher Receipt";
    refLabel = "Receipt #";
    refValue = data.receiptNumber || "N/A";
    partyLabel = "Supplier / Miller";
    partyName = data.millerId?.name || data.miller?.name || "Supplier";
    partyPhone = data.millerId?.phone || data.miller?.phone || "";
    partyAddress = data.millerId?.address || data.miller?.address || "";
    dateValue = data.date ? formatDate(data.date) : dateValue;
    status = data.status || "unpaid";
    totalAmount = Number(data.totalAmount || 0);
    paidAmount = Number(data.paidAmount || 0);
    remainingAmount = Number(data.remainingAmount || 0);
    paymentMethod = data.paymentType || "Cash";
  } else if (type === "payment") {
    const isInflow = data.type === "inflow";
    title = isInflow ? "Payment Inflow Receipt" : "Payment Outflow Voucher";
    refLabel = "Payment Ref #";
    refValue = data.referenceNumber || data._id?.substring(0, 8) || "N/A";
    partyLabel = isInflow ? "Received From" : "Paid To";
    partyName = data.partyId?.name || data.partyName || "Party";
    partyPhone = data.partyId?.phone || "";
    dateValue = data.paymentDate
      ? formatDate(data.paymentDate)
      : dateValue;
    status = "paid";
    totalAmount = Number(data.amount || 0);
    paidAmount = totalAmount;
    remainingAmount = 0;
    paymentMethod = data.paymentMethod || "Cash";
  } else if (type === "bank") {
    title =
      data.type === "deposit"
        ? "Bank Deposit Voucher"
        : data.type === "withdrawal"
          ? "Bank Withdrawal Voucher"
          : "Bank Transaction Voucher";
    refLabel = "Tx Ref #";
    refValue = data.referenceNumber || "BANK-TX";
    partyLabel = "Bank Account";
    partyName =
      data.bankAccountId?.accountName ||
      data.bankAccountId?.bankName ||
      "Bank Account";
    partyPhone = data.bankAccountId?.accountNumber
      ? `A/C: ${data.bankAccountId.accountNumber}`
      : "";
    dateValue = data.date ? formatDate(data.date) : dateValue;
    status = "paid";
    totalAmount = Number(data.amount || 0);
    paidAmount = totalAmount;
    remainingAmount = 0;
    paymentMethod = data.paymentMethod || "Bank Transfer";
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setDownloading(true);
      const canvas = await captureReceiptCanvas(receiptRef.current);
      buildPdfFromCanvas(canvas, refValue);
      toast.success("Receipt PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF. Using print dialog.");
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    try {
      setDownloading(true);
      const canvas = await captureReceiptCanvas(receiptRef.current);
      const link = document.createElement("a");
      link.download = `Receipt_${refValue || "Doc"}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast.success("Receipt Image saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save image");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };


  const handleWhatsAppShare = async () => {
    if (!receiptRef.current) return;

    try {
      setSharing(true);
      const canvas = await captureReceiptCanvas(receiptRef.current);
      const blob = await canvasToBlob(canvas, "image/png", 1.0);

      if (!blob) throw new Error("Could not generate receipt image");

      const fileName = `Receipt_${refValue || "Doc"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const whatsappNumber = resolveWhatsAppNumber(partyPhone);

      const canShareFiles =
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title,
        });
        toast.success("Receipt ready to share!");
      } else {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);

        const waUrl = `https://wa.me/${whatsappNumber}`;
        window.open(waUrl, "_blank");

        toast.info(
          "Receipt image downloaded — attach it in the WhatsApp chat that just opened."
        );
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err);
        toast.error("Failed to share receipt image");
      }
    } finally {
      setSharing(false);
    }
  };


  const handleReceiptImageTap = async () => {
    if (!mobileView || !receiptRef.current || downloading || sharing) return;

    try {
      setSharing(true);
      const canvas = await captureReceiptCanvas(receiptRef.current);
      const blob = await canvasToBlob(canvas, "image/png", 1.0);
      if (!blob) throw new Error("Could not generate receipt image");

      const fileName = `Receipt_${refValue || "Doc"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({ files: [file], title });
        return;
      }

      if (isIOS()) {
        const dataUrl = canvas.toDataURL("image/png", 1.0);
        const win = window.open();
        if (win) {
          win.document.write(
            `<title>${fileName}</title><img src="${dataUrl}" style="width:100%;height:auto;" />`
          );
        }
        toast.info("Long-press the image and choose “Add to Photos” to save it.");
        return;
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Receipt image saved!");
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err);
        toast.error("Failed to save receipt image");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={mobileView}>
      {/* Dialog Header Actions */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: colors["100"],
          borderBottom: `1px solid ${colors["300"]}`,
          padding: "12px 24px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: colors["950"] }}>
          🧾 {title}
        </Typography>

        <Box sx={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <Tooltip title="Download PDF">
            <Button
              size="small"
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadPDF}
              disabled={downloading || sharing}
              sx={{ backgroundColor: colors["900"], textTransform: "none", fontWeight: "bold" }}
            >
              PDF
            </Button>
          </Tooltip>

          <Tooltip title="Download Image">
            <Button
              size="small"
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={handleDownloadImage}
              disabled={downloading || sharing}
              sx={{ textTransform: "none", fontWeight: "bold" }}
            >
              Image
            </Button>
          </Tooltip>

          <Tooltip title="Share on WhatsApp">
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={handleWhatsAppShare}
              disabled={downloading || sharing}
              sx={{ textTransform: "none", fontWeight: "bold" }}
            >
              WhatsApp
            </Button>
          </Tooltip>

          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Printable Receipt Canvas */}
      <DialogContent sx={{ padding: "24px", backgroundColor: "#f8fafc" }}>
        <Box
          ref={receiptRef}
          onClick={mobileView ? handleReceiptImageTap : undefined}
          sx={{
            ...styles.receiptWrapper,
            // Avoid any container clipping the receipt during capture.
            overflow: "visible",
            height: "auto",
            maxHeight: "none",
            cursor: mobileView ? "pointer" : "default",
          }}
        >
          {/* Header */}
          <Box sx={styles.header}>
            <Box>
              <Typography sx={styles.companyName}>TRACKING SYSTEM</Typography>
              <Typography sx={styles.companyTagline}>
                Commercial Inventory, Milling & Payment Tracking
              </Typography>
            </Box>
            <Box>
              <Typography sx={styles.receiptTitle}>{title}</Typography>
              <Typography sx={styles.receiptMeta}>
                <strong>{refLabel}:</strong> {refValue}
              </Typography>
              <Typography sx={styles.receiptMeta}>
                <strong>Date:</strong> {dateValue}
              </Typography>
            </Box>
          </Box>

          {/* Party & Voucher Info */}
          <Box sx={styles.infoSection}>
            <Box sx={styles.infoCol}>
              <Typography sx={styles.infoLabel}>{partyLabel}</Typography>
              <Typography sx={styles.infoValue}>{partyName}</Typography>
              {partyPhone && (
                <Typography variant="body2" color="textSecondary">
                  Phone: {partyPhone}
                </Typography>
              )}
              {partyAddress && (
                <Typography variant="body2" color="textSecondary">
                  Address: {partyAddress}
                </Typography>
              )}
            </Box>

            <Box sx={{ ...styles.infoCol, alignItems: "flex-end" }}>
              <Typography sx={styles.infoLabel}>Payment Status</Typography>
              <Box sx={{ marginTop: "4px" }}>
                {status === "paid" && <span style={styles.paidStamp}>PAID</span>}
                {status === "partial" && <span style={styles.partialStamp}>PARTIAL</span>}
                {status === "unpaid" && <span style={styles.unpaidStamp}>UNPAID</span>}
              </Box>
            </Box>
          </Box>

          {/* Item Details - For Sales & Stock (Multi-Item or Single-Item) */}
          {(type === "sale" || type === "stock") && (
            <Box sx={styles.itemList}>
              <Typography sx={styles.sectionTitle}>
                {Array.isArray(data.items) && data.items.length > 1
                  ? `Purchased / Billed Items (${data.items.length})`
                  : "Item Details"}
              </Typography>

              {Array.isArray(data.items) && data.items.length > 1 ? (
                <Box sx={{ mb: 2 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#F1F5F9", borderBottom: `2px solid ${colors["300"]}` }}>
                        <th style={{ textAlign: "left", padding: "8px 10px" }}>Item</th>
                        <th style={{ textAlign: "center", padding: "8px 10px" }}>Qty (Katte)</th>
                        <th style={{ textAlign: "center", padding: "8px 10px" }}>Weight (kg)</th>
                        <th style={{ textAlign: "right", padding: "8px 10px" }}>Rate</th>
                        <th style={{ textAlign: "right", padding: "8px 10px" }}>Bhardana</th>
                        <th style={{ textAlign: "right", padding: "8px 10px" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((it, idx) => (
                        <tr key={it._id || idx} style={{ borderBottom: `1px solid ${colors["200"]}` }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{it.itemName}</td>
                          <td style={{ textAlign: "center", padding: "8px 10px" }}>{it.quantity || it.totalQuantity}</td>
                          <td style={{ textAlign: "center", padding: "8px 10px" }}>{it.weight || it.totalWeight} kg</td>
                          <td style={{ textAlign: "right", padding: "8px 10px" }}>Rs. {it.rate || it.purchaseRate}</td>
                          <td style={{ textAlign: "right", padding: "8px 10px" }}>Rs. {it.bhardana || 0}</td>
                          <td style={{ textAlign: "right", padding: "8px 10px", fontWeight: 700 }}>
                            Rs. {(it.totalAmount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <Box
                    sx={{
                      ...styles.itemRow,
                      fontWeight: 900,
                      mt: 1.5,
                      pt: 1,
                      borderTop: `2px solid ${colors["300"]}`,
                    }}
                  >
                    <Typography sx={{ ...styles.itemLabel, color: colors.primary }}>
                      Combined Total
                    </Typography>
                    <Typography sx={{ ...styles.itemValue, color: colors.primary, fontWeight: 900 }}>
                      Rs. {totalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <>
                  <Box sx={styles.itemRow}>
                    <Typography sx={styles.itemLabel}>Description / Item</Typography>
                    <Typography sx={styles.itemValue}>
                      {data.itemName || (data.items && data.items[0]?.itemName) || "Commercial Goods"}
                    </Typography>
                  </Box>

                  <Box sx={styles.itemRow}>
                    <Typography sx={styles.itemLabel}>Quantity</Typography>
                    <Typography sx={styles.itemValue}>
                      {data.quantity || data.totalQuantity || (data.items && (data.items[0]?.quantity || data.items[0]?.totalQuantity)) || "-"}
                    </Typography>
                  </Box>

                  <Box sx={styles.itemRow}>
                    <Typography sx={styles.itemLabel}>Weight</Typography>
                    <Typography sx={styles.itemValue}>
                      {data.weight || data.totalWeight || (data.items && (data.items[0]?.weight || data.items[0]?.totalWeight))
                        ? `${data.weight || data.totalWeight || (data.items[0]?.weight || data.items[0]?.totalWeight)} kg`
                        : "-"}
                    </Typography>
                  </Box>

                  <Box sx={styles.itemRow}>
                    <Typography sx={styles.itemLabel}>Rate</Typography>
                    <Typography sx={styles.itemValue}>
                      Rs. {data.rate || data.purchaseRate || (data.items && (data.items[0]?.rate || data.items[0]?.purchaseRate)) || 0}
                    </Typography>
                  </Box>

                  <Box sx={styles.itemRow}>
                    <Typography sx={styles.itemLabel}>Bhardana</Typography>
                    <Typography sx={styles.itemValue}>
                      Rs. {data.bhardana || (data.items && data.items[0]?.bhardana) || 0}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      ...styles.itemRow,
                      fontWeight: 900,
                    }}
                  >
                    <Typography
                      sx={{
                        ...styles.itemLabel,
                        color: colors.primary,
                      }}
                    >
                      Total Amount
                    </Typography>

                    <Typography
                      sx={{
                        ...styles.itemValue,
                        color: colors.primary,
                        fontWeight: 900,
                      }}
                    >
                      Rs. {totalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Transaction Details - For Payment & Bank */}
          {(type === "payment" || type === "bank") && (
            <Box sx={styles.itemList}>
              <Typography sx={styles.sectionTitle}>
                Transaction Details
              </Typography>

              <Box sx={styles.itemRow}>
                <Typography sx={styles.itemLabel}>
                  Particulars
                </Typography>
                <Typography sx={styles.itemValue}>
                  {data.notes || title}
                </Typography>
              </Box>

              <Box sx={styles.itemRow}>
                <Typography sx={styles.itemLabel}>
                  Payment Mode
                </Typography>
                <Typography
                  sx={{
                    ...styles.itemValue,
                    textTransform: "capitalize",
                  }}
                >
                  {paymentMethod?.replace("_", " ")}
                </Typography>
              </Box>

              <Box sx={styles.itemRow}>
                <Typography sx={styles.itemLabel}>
                  Reference
                </Typography>
                <Typography sx={styles.itemValue}>
                  {refValue}
                </Typography>
              </Box>

              <Box sx={styles.itemRow}>
                <Typography sx={styles.itemLabel}>
                  Amount
                </Typography>
                <Typography
                  sx={{
                    ...styles.itemValue,
                    color: colors.primary,
                    fontWeight: 900,
                  }}
                >
                  Rs. {totalAmount}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Summary Box */}
          <Box sx={styles.summaryContainer}>
            <Box sx={styles.summaryBox}>
              <Box sx={styles.summaryRow}>
                <span>Total Amount:</span>
                <strong>Rs. {totalAmount}</strong>
              </Box>
              <Box sx={styles.summaryRow}>
                <span>Paid Amount:</span>
                <strong style={{ color: "#16a34a" }}>Rs. {paidAmount}</strong>
              </Box>
              <Box sx={styles.summaryTotalRow}>
                <span>Balance Due:</span>
                <span style={{ color: remainingAmount > 0 ? colors["error"] : colors["success"] }}>
                  Rs. {remainingAmount}
                </span>
              </Box>
            </Box>
          </Box>

          {/* Footer Signature */}
          <Box sx={styles.footer}>
            <Box sx={styles.signBlock}>
              <Box sx={styles.signLine}></Box>
              <Typography sx={styles.signLabel}>Customer / Receiver Signature</Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              * This is a computer generated voucher and invoice record.
            </Typography>
            <Box sx={styles.signBlock}>
              <Box sx={styles.signLine}></Box>
              <Typography sx={styles.signLabel}>Authorized Signature</Typography>
            </Box>
          </Box>

          {mobileView && (
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ display: "block", textAlign: "center", mt: 1 }}
            >
              Tap the receipt to save it as an image
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: "12px 24px" }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ backgroundColor: colors["300"], color: colors["950"], fontWeight: "bold" }}
        >
          Print Receipt
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptModal;

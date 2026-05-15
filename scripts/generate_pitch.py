"""
Generate Cooker's Delight pitch PDF.
Run: python3 scripts/generate_pitch.py
Output: cookers-delight-pitch.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ── Brand colours ────────────────────────────────────────────────────────────
BRAND_RED   = colors.HexColor("#C0392B")
BRAND_DARK  = colors.HexColor("#1A1A1A")
BRAND_CREAM = colors.HexColor("#FDF6EC")
BRAND_GOLD  = colors.HexColor("#E67E22")
BRAND_LIGHT = colors.HexColor("#F9F1E7")
WHITE       = colors.white
GREY_TEXT   = colors.HexColor("#555555")
GREY_LINE   = colors.HexColor("#DDDDDD")

W, H = A4  # 595 x 842 pts

# ── Document ─────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    "/home/user/cookers-delight/cookers-delight-pitch.pdf",
    pagesize=A4,
    topMargin=1.5 * cm,
    bottomMargin=1.5 * cm,
    leftMargin=1.8 * cm,
    rightMargin=1.8 * cm,
)

styles = getSampleStyleSheet()

# ── Custom styles ─────────────────────────────────────────────────────────────
def S(name, **kw):
    return ParagraphStyle(name, **kw)

cover_title = S("CoverTitle",
    fontSize=34, leading=40, textColor=WHITE,
    fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=8)

cover_sub = S("CoverSub",
    fontSize=14, leading=20, textColor=colors.HexColor("#FFD9B0"),
    fontName="Helvetica", alignment=TA_CENTER, spaceAfter=4)

cover_tag = S("CoverTag",
    fontSize=11, leading=16, textColor=colors.HexColor("#FAC98E"),
    fontName="Helvetica-Oblique", alignment=TA_CENTER)

section_head = S("SectionHead",
    fontSize=15, leading=19, textColor=WHITE,
    fontName="Helvetica-Bold", alignment=TA_LEFT, spaceAfter=2)

sub_head = S("SubHead",
    fontSize=11, leading=14, textColor=BRAND_RED,
    fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)

body = S("Body",
    fontSize=9.5, leading=14, textColor=BRAND_DARK,
    fontName="Helvetica", spaceAfter=4)

body_cream = S("BodyCream",
    fontSize=9.5, leading=14, textColor=BRAND_DARK,
    fontName="Helvetica", spaceAfter=4, backColor=BRAND_LIGHT)

bullet_style = S("Bullet",
    fontSize=9.5, leading=14, textColor=BRAND_DARK,
    fontName="Helvetica", leftIndent=14, spaceAfter=3,
    bulletIndent=2, bulletText="•")

flow_step = S("FlowStep",
    fontSize=9, leading=13, textColor=WHITE,
    fontName="Helvetica-Bold", alignment=TA_CENTER)

value_head = S("ValueHead",
    fontSize=10, leading=13, textColor=BRAND_RED,
    fontName="Helvetica-Bold", alignment=TA_CENTER)

value_body = S("ValueBody",
    fontSize=9, leading=13, textColor=GREY_TEXT,
    fontName="Helvetica", alignment=TA_CENTER)

closing_head = S("ClosingHead",
    fontSize=20, leading=26, textColor=BRAND_RED,
    fontName="Helvetica-Bold", alignment=TA_CENTER, spaceBefore=10)

closing_body = S("ClosingBody",
    fontSize=10, leading=15, textColor=GREY_TEXT,
    fontName="Helvetica", alignment=TA_CENTER, spaceAfter=4)

story = []

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def section_banner(title):
    """Red banner with white title."""
    tbl = Table([[Paragraph(title, section_head)]],
                colWidths=[doc.width])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_RED),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BRAND_RED]),
    ]))
    story.append(Spacer(1, 10))
    story.append(tbl)
    story.append(Spacer(1, 6))


def bullet(text):
    story.append(Paragraph(f"<bullet>&bull;</bullet> {text}", bullet_style))


def rule():
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY_LINE))
    story.append(Spacer(1, 4))


def kv_table(rows, col_a=6*cm, col_b=None):
    """Two-column table: label | value."""
    cb = col_b or (doc.width - col_a)
    data = [[Paragraph(f"<b>{k}</b>", body), Paragraph(v, body)] for k, v in rows]
    tbl = Table(data, colWidths=[col_a, cb])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BRAND_LIGHT, WHITE]),
        ("LEFTPADDING", (0, 0), (0, -1), 8),
        ("LEFTPADDING", (1, 0), (1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 6))


# ─────────────────────────────────────────────────────────────────────────────
# PAGE 1 — COVER
# ─────────────────────────────────────────────────────────────────────────────

cover_content = [
    [
        Paragraph("COOKER'S DELIGHT", cover_title),
        Spacer(1, 6),
        Paragraph("Your Restaurant, Fully Digital", cover_sub),
        Spacer(1, 4),
        Paragraph("A complete platform for your team and every guest — across all four Accra branches.", cover_tag),
    ]
]
cover_tbl = Table(cover_content, colWidths=[doc.width])
cover_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0, 0), (-1, -1), BRAND_RED),
    ("TOPPADDING",    (0, 0), (-1, -1), 48),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 48),
    ("LEFTPADDING",   (0, 0), (-1, -1), 24),
    ("RIGHTPADDING",  (0, 0), (-1, -1), 24),
    ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
]))
story.append(cover_tbl)
story.append(Spacer(1, 18))

# Intro paragraph
story.append(Paragraph(
    "We have built a modern, end-to-end digital system tailored specifically for Cooker's Delight. "
    "It connects your customers, your kitchen staff, and your management — all in one platform.",
    body
))
story.append(Spacer(1, 8))

# Three pillars
pillars = [
    ["🌐  Public Website", "📱  QR Table Ordering", "🖥  Admin Dashboard"],
    [
        Paragraph("Customers discover your menu, branches, and book tables — anytime.", value_body),
        Paragraph("Guests scan, order, pay, and track their food — right at the table.", value_body),
        Paragraph("Your team manages orders, menu, and branches from one place.", value_body),
    ]
]
pillar_tbl = Table(pillars, colWidths=[doc.width / 3] * 3)
pillar_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0, 0), (-1, 0), BRAND_GOLD),
    ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
    ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE",      (0, 0), (-1, 0), 10),
    ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING",    (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ("BACKGROUND",    (0, 1), (-1, 1), BRAND_LIGHT),
    ("GRID", (0, 0), (-1, -1), 0.5, GREY_LINE),
]))
story.append(pillar_tbl)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — FOR YOUR CUSTOMERS
# ─────────────────────────────────────────────────────────────────────────────

section_banner("For Your Customers")

story.append(Paragraph("Browse Your Menu, Anywhere", sub_head))
story.append(Paragraph(
    "Customers visit your website from any phone, tablet, or computer. "
    "They can filter dishes by category — Ghanaian, Nigerian, Fast Food, Snacks, Sides, and Continental — "
    "or search for a specific item. Every dish shows its price, prep time, and a beautiful photo.",
    body
))

story.append(Paragraph("Reserve a Table Online", sub_head))
story.append(Paragraph(
    "A guest can book a table from your website in under a minute. "
    "They pick a branch, choose a date, select the number of guests, and confirm with their name and contact. "
    "Available time slots update automatically based on your branch hours.",
    body
))

story.append(Paragraph("Dine-In QR Ordering — No App Needed", sub_head))
story.append(Paragraph(
    "Every table has a printed QR code. A guest scans it with their phone camera. "
    "The menu opens instantly in their browser — no download, no account required. "
    "They browse, add items to their cart, and place the order. "
    "Payment is handled securely through Paystack, Ghana's trusted payment gateway.",
    body
))

story.append(Paragraph("Live Order Tracking", sub_head))
story.append(Paragraph(
    "After paying, customers see their order status update in real time — "
    "<b>Pending → Received → Preparing → Ready → Served.</b> "
    "No more 'how long is my food?' They always know exactly where their order stands.",
    body
))

story.append(Paragraph("Find Your Branches Instantly", sub_head))
story.append(Paragraph(
    "The Branches page shows all four Accra locations — Kaneshie, Circle, East Legon, and Swan Lake — "
    "with addresses, phone numbers, WhatsApp links, and live Open/Closed status.",
    body
))

story.append(Paragraph("WhatsApp Ordering", sub_head))
story.append(Paragraph(
    'Customers can also tap "Order Now" on the menu page and get a pre-filled WhatsApp message '
    "sent straight to your team — perfect for takeaway and delivery requests.",
    body
))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — FOR YOUR TEAM
# ─────────────────────────────────────────────────────────────────────────────

section_banner("For Your Team & Management")

story.append(Paragraph("Live Dashboard — Know Your Business at a Glance", sub_head))
story.append(Paragraph(
    "The admin dashboard shows today's orders, total revenue, tables occupied, and pending orders — "
    "all updating in real time. Your manager logs in and sees exactly what's happening across the restaurant.",
    body
))

story.append(Paragraph("Order Management", sub_head))
story.append(Paragraph(
    "Every incoming order appears on the Orders page. Staff can view the customer's items, "
    "table number, and total. Updating the order status is one click — "
    "and the customer's screen updates instantly.",
    body
))

story.append(Paragraph("Menu & Category Control — No Developer Needed", sub_head))
story.append(Paragraph(
    "Add a new dish, update a price, upload a photo, or disable an item — all from the admin panel. "
    "Organise your menu into categories and set the order they appear in.",
    body
))

story.append(Paragraph("Table & QR Code Management", sub_head))
story.append(Paragraph(
    "Add or remove tables per branch. Each table gets a permanent QR code you can print. "
    "If a card is lost, the QR link remains the same — no reprinting system needed.",
    body
))

story.append(Paragraph("Branch Management", sub_head))
story.append(Paragraph(
    "Edit the address, phone number, operating hours, and open/closed status for each of your "
    "four branches from one screen. Changes go live immediately on your website.",
    body
))

story.append(Paragraph("Announcements", sub_head))
story.append(Paragraph(
    "Publish a promotion, a public holiday notice, or a new dish announcement. "
    "It appears as a banner on your website the moment you save it. "
    "Turn it off just as quickly when the promotion ends.",
    body
))

story.append(Paragraph("Settings — Full Control", sub_head))
kv_table([
    ("Restaurant Info",  "Update your name, tagline, social media links, and footer text."),
    ("Order Options",    "Enable or disable dine-in, pickup, or delivery independently."),
    ("Payments",         "Manage your Paystack keys and currency settings."),
    ("Notifications",    "Get email or SMS alerts the moment a new order comes in."),
    ("Appearance",       "Set your brand colours, logo, and hero image. Flip on maintenance mode anytime."),
    ("Prep Times",       "Set per-dish preparation times so customers always get accurate estimates."),
    ("Order Statuses",   "Customise the status names and colours that appear in the kitchen flow."),
])


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — KEY FLOWS
# ─────────────────────────────────────────────────────────────────────────────

section_banner("How It All Works — Key Flows")

story.append(Paragraph("Dine-In Flow (QR Ordering)", sub_head))

steps = [
    ("1\nScan QR", "Guest scans table QR with phone camera"),
    ("2\nBrowse", "Menu loads instantly in the browser"),
    ("3\nOrder", "Add items and place order"),
    ("4\nPay", "Checkout via Paystack (card, mobile money)"),
    ("5\nTrack", "Live status updates until served"),
]
step_labels = [[Paragraph(s[0], flow_step) for s in steps]]
step_descs  = [[Paragraph(s[1], value_body) for s in steps]]

flow_tbl = Table(step_labels + step_descs, colWidths=[doc.width / 5] * 5)
flow_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0, 0), (-1, 0), BRAND_RED),
    ("BACKGROUND",    (0, 1), (-1, 1), BRAND_LIGHT),
    ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING",    (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("GRID", (0, 0), (-1, -1), 0.5, GREY_LINE),
]))
story.append(flow_tbl)
story.append(Spacer(1, 10))

story.append(Paragraph("Online Customer Flow (Website)", sub_head))

steps2 = [
    ("1\nVisit Site", "Open the website on any device"),
    ("2\nExplore", "Browse menu, gallery, branches, reviews"),
    ("3\nAct", "WhatsApp order — or book a table"),
    ("4\nConfirm", "Receive booking confirmation"),
]
s2l = [[Paragraph(s[0], flow_step) for s in steps2]]
s2d = [[Paragraph(s[1], value_body) for s in steps2]]
flow_tbl2 = Table(s2l + s2d, colWidths=[doc.width / 4] * 4)
flow_tbl2.setStyle(TableStyle([
    ("BACKGROUND",    (0, 0), (-1, 0), BRAND_GOLD),
    ("BACKGROUND",    (0, 1), (-1, 1), BRAND_LIGHT),
    ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING",    (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("GRID", (0, 0), (-1, -1), 0.5, GREY_LINE),
]))
story.append(flow_tbl2)
story.append(Spacer(1, 10))

story.append(Paragraph("Admin Flow", sub_head))

steps3 = [
    ("Login", "Secure admin login with lockout protection"),
    ("Dashboard", "See live KPIs — orders, revenue, tables"),
    ("Orders", "Update order status in one click"),
    ("Manage", "Edit menu, branches, tables, announcements"),
    ("Configure", "Adjust settings anytime — no developer needed"),
]
s3l = [[Paragraph(s[0], flow_step) for s in steps3]]
s3d = [[Paragraph(s[1], value_body) for s in steps3]]
flow_tbl3 = Table(s3l + s3d, colWidths=[doc.width / 5] * 5)
flow_tbl3.setStyle(TableStyle([
    ("BACKGROUND",    (0, 0), (-1, 0), BRAND_DARK),
    ("BACKGROUND",    (0, 1), (-1, 1), BRAND_LIGHT),
    ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING",    (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("GRID", (0, 0), (-1, -1), 0.5, GREY_LINE),
]))
story.append(flow_tbl3)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — WHY THIS SYSTEM
# ─────────────────────────────────────────────────────────────────────────────

section_banner("Why This System?")

reasons = [
    ("No App Download",       "Everything runs in the customer's phone browser — nothing to install."),
    ("Secure Payments",       "Paystack handles all transactions. Payments are verified server-side — no fraud risk."),
    ("Real-Time Kitchen Updates", "Customers know where their food is. Staff know what's pending. No more guessing."),
    ("Works on Any Device",   "Phone, tablet, laptop — the website and ordering system adapt to every screen size."),
    ("One Platform, Four Branches", "All your locations, menus, tables, and orders managed from a single admin panel."),
    ("Always Up to Date",     "Your website reflects your latest menu, hours, and announcements the moment you save."),
    ("Built for Ghana",       "Paystack integration supports card and mobile money payments used by your customers."),
]

grid_data = []
row = []
for i, (title, desc) in enumerate(reasons):
    cell = [
        Paragraph(title, value_head),
        Spacer(1, 3),
        Paragraph(desc, value_body),
    ]
    row.append(cell)
    if len(row) == 3:
        grid_data.append(row)
        row = []
if row:
    while len(row) < 3:
        row.append([Paragraph("", value_body)])
    grid_data.append(row)

reasons_tbl = Table(grid_data, colWidths=[doc.width / 3] * 3)
reasons_tbl.setStyle(TableStyle([
    ("BACKGROUND",    (0, 0), (-1, -1), BRAND_LIGHT),
    ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING",    (0, 0), (-1, -1), 10),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.5, GREY_LINE),
]))
story.append(reasons_tbl)


# ─────────────────────────────────────────────────────────────────────────────
# CLOSING
# ─────────────────────────────────────────────────────────────────────────────

story.append(Spacer(1, 20))
story.append(HRFlowable(width="100%", thickness=1, color=BRAND_RED))
story.append(Spacer(1, 14))

story.append(Paragraph("Ready to Go Live?", closing_head))
story.append(Spacer(1, 6))
story.append(Paragraph(
    "The platform is built, tested, and ready to serve your customers across all four branches. "
    "We are here to walk your team through it, train your staff, and keep things running smoothly.",
    closing_body
))
story.append(Spacer(1, 10))

contact_data = [
    [
        Paragraph("📍  4 Branches in Accra, Ghana", closing_body),
        Paragraph("💬  WhatsApp & Social Media Ready", closing_body),
        Paragraph("💳  Paystack Payments Integrated", closing_body),
    ]
]
contact_tbl = Table(contact_data, colWidths=[doc.width / 3] * 3)
contact_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), BRAND_RED),
    ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
    ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
    ("TOPPADDING",    (0, 0), (-1, -1), 12),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
]))
story.append(contact_tbl)

story.append(Spacer(1, 10))
story.append(Paragraph(
    "Cooker's Delight — Bringing great food and great technology together.",
    S("Footer", fontSize=9, textColor=GREY_TEXT, fontName="Helvetica-Oblique", alignment=TA_CENTER)
))

# ─────────────────────────────────────────────────────────────────────────────
# BUILD
# ─────────────────────────────────────────────────────────────────────────────
doc.build(story)
print("✅  PDF generated: cookers-delight-pitch.pdf")

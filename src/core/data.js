/* ════════════════════════════════════════════════════════════════════
   CORE/DATA.JS
   Auto-generated from KBiz360_v2.jsx · 1103 lines · 56 declarations
   ════════════════════════════════════════════════════════════════════ */

import { FileText } from 'lucide-react';

function vDate(){
  const d=new Date();
  return String(d.getDate()).padStart(2,"0")+String(d.getFullYear()).slice(-2);
}

export const BRANCHES=[
  {code:"TKHO", city:"Head Office",   country:"India",      flag:"🇮🇳",currency:"INR",tax:"GST 5%/18%",isHO:true },
  {code:"AMD",city:"Ahmedabad",     country:"India",      flag:"🇮🇳",currency:"INR",tax:"GST 5%/18%",isHO:false},
  {code:"BOM",city:"Mumbai",        country:"India",      flag:"🇮🇳",currency:"INR",tax:"GST 5%/18%",isHO:false},
  {code:"DAR",city:"Dar es Salaam", country:"Tanzania",   flag:"🇹🇿",currency:"TZS",tax:"VAT 18%",   isHO:false},
  {code:"NBO",city:"Nairobi",       country:"Kenya",      flag:"🇰🇪",currency:"KES",tax:"VAT 16%",   isHO:false},
  {code:"FBM",city:"Lubumbashi",    country:"DR Congo",   flag:"🇨🇩",currency:"USD",tax:"VAT 16%",   isHO:false},
];

/* ── Per-branch data ─────────────────────────────────────────────────
   Each branch is fully independent: own books, currency, tax regime.
   India (BOM/AMD): INR, GST   |   Africa (DAR/NBO/FBM): local currency, VAT
   ─────────────────────────────────────────────────────────────────── */

export const _VNO_COUNTERS={};

/* Seed: each branch starts its own sequence independently */

export const _VNO_SEED={
  BOM:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1},
  AMD:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1},
  NBO:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1},
  DAR:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1},
  FBM:{SF:1,SH:1,SC:1,SV:1,SHT:1,SI:1,SM:1,SCN:1,PF:1,PH:1,PHT:1,PV:1,PC:1,PI:1,PM:1,RV:1,PMT:1,CV:1,JV:1,DB:1,BR:1},
};


export function genVNo(branch,pfx){
  const brCode=branch==="ALL"?"CONS":(branch?.code||"BOM");
  const key=brCode+"_"+pfx;
  if(_VNO_COUNTERS[key]===undefined){
    _VNO_COUNTERS[key]=(_VNO_SEED[brCode]&&_VNO_SEED[brCode][pfx])||1;
  }
  const seq=_VNO_COUNTERS[key]++;
  return brCode+"/"+vDate()+"/"+pfx+String(seq).padStart(5,"0");
}

/* One-shot hook: generate voucher number once on mount, stable on re-renders */

export const TAX_INDIA = {label:"Taxation — GST", icon:FileText, _regime:"GST", children:[
  /* — Returns — */
  {divider:true, label:"GST Returns"},
  {label:"GSTR-1  Outward Supplies", href:"/tax/gstr1"},
  {label:"GSTR-3B Summary Return",   href:"/tax/gstr3b"},
  {label:"GSTR-2B Reconciliation",   href:"/tax/gstr2b"},
  /* — TDS — */
  {divider:true, label:"TDS / TCS"},
  {label:"TDS & TCS Register",        href:"/tax/tds"},
  {label:"Form 26AS", href:"/tax/form26as", icon:"📑"},
          {label:"E-Way Bill", href:"/tax/eway", icon:"📦"},
          {label:"TDS Certificates (16A)", href:"/tax/tds-certs"},
  {label:"RCM Register",              href:"/tax/rcm"},
  /* — Compliance — */
  {divider:true, label:"Compliance"},
  {label:"E-Invoice & IRN",           href:"/tax/einvoice"},
  {label:"Compliance Calendar",       href:"/tax/calendar"},
  {label:"GSTR-9C — Audit Reco",    href:"/tax/gstr9c"},
  {label:"Tax Audit 3CD",           href:"/tax/audit-3cd"},
  {label:"GSTR-2A Reconciliation",  href:"/tax/gstr2a"},
  {divider:true, label:"Auto-Prep Tools"},
  {label:"GSTR-1 Auto-Prep", href:"/tax/gstr-1-prep"},
  {label:"GSTR-3B Auto-Prep", href:"/tax/gstr-3b-prep"},
  {label:"Form 16A Generator", href:"/tax/form-16a"},
  {label:"Tax Calendar & Reminders", href:"/tax/calendar"},
]};

/* ── TAXATION — AFRICA VAT ───────────────────────────────────── */

export const TAX_AFRICA = {label:"Taxation — VAT", icon:FileText, _regime:"VAT", children:[
  {divider:true, label:"VAT Returns"},
  {label:"VAT Return (Monthly)",      href:"/tax/vat"},
  {label:"Withholding Tax",           href:"/tax/tds"},
  {divider:true, label:"Compliance"},
  {label:"Compliance Calendar",       href:"/tax/calendar"},
]};

/* ── TAXATION — TRAVKINGS GROUP ─────────────────────────────────── */

export const TAX_ALL = {label:"Taxation", icon:FileText, _regime:"ALL", children:[
  {divider:true, label:"India — GST"},
  {label:"GSTR-1",                    href:"/tax/gstr1"},
  {label:"GSTR-3B",                   href:"/tax/gstr3b"},
  {label:"GSTR-2B Recon",             href:"/tax/gstr2b"},
  {label:"TDS / TCS",                 href:"/tax/tds"},
  {label:"TDS Certificates (16A)",    href:"/tax/tds-certs"},
  {label:"RCM Register",              href:"/tax/rcm"},
  {label:"E-Invoice & IRN",           href:"/tax/einvoice"},
  {divider:true, label:"Africa — VAT"},
  {label:"VAT Return",                href:"/tax/vat"},
  {label:"Withholding Tax (WHT)",     href:"/tax/tds"},
  {divider:true, label:"Travkings Group"},
  {label:"Compliance Calendar",       href:"/tax/calendar"},
]};

/* ── REPORTS ─────────────────────────────────────────────────── */

export const MOD_DATA=[
  {m:"Dec",Flight:42,Holiday:28,Hotel:14,Car:6,Visa:5,Other:4},
  {m:"Jan",Flight:48,Holiday:32,Hotel:16,Car:7,Visa:6,Other:4},
  {m:"Feb",Flight:52,Holiday:36,Hotel:18,Car:8,Visa:6,Other:5},
  {m:"Mar",Flight:55,Holiday:38,Hotel:19,Car:8,Visa:7,Other:5},
  {m:"Apr",Flight:58,Holiday:40,Hotel:20,Car:9,Visa:7,Other:6},
  {m:"May",Flight:62,Holiday:42,Hotel:21,Car:9,Visa:8,Other:6},
];

export const MIX=[
  {name:"Flight",value:42,color:"#378ADD"},
  {name:"Holiday",value:28,color:"#1D9E75"},
  {name:"Hotel",value:14,color:"#BA7517"},
  {name:"Car",value:6,color:"#7F77DD"},
  {name:"Visa",value:5,color:"#D4537E"},
  {name:"Other",value:5,color:"#5F5E5A"},
];

export const CASH=Array.from({length:30},(_,i)=>({day:i+1,inflow:Math.round(80+Math.sin(i/4)*30+(i>20?40:0)),outflow:Math.round(65+Math.cos(i/3)*20)}));

/* Salespeople — synced from CRM. Used on every sale/purchase voucher to match transactions back to a CRM owner. */
export const SALESPEOPLE=[
  {id:"RAHM",name:"Rahul M",   branch:"BOM"},
  {id:"PRIS",name:"Priya S",   branch:"BOM"},
  {id:"AMIK",name:"Amit K",    branch:"BOM"},
  {id:"NEHP",name:"Neha P",    branch:"AMD"},
  {id:"KEVO",name:"Kevin O",   branch:"NBO"},
  {id:"AMIH",name:"Amina H",   branch:"DAR"},
  {id:"SUJE",name:"Sujeet",    branch:"FBM"},
];

export const CUSTOMERS=[
  {name:"Sharma Enterprises",rev:"₹18.4 L",out:"₹2.15 L",ov:false},
  {name:"Apex Pharma",       rev:"₹12.8 L",out:"₹1.80 L",ov:false},
  {name:"Globex Consulting", rev:"₹9.60 L", out:"₹3.40 L",ov:true},
  {name:"Nexus Industries",  rev:"₹7.20 L", out:"₹85,000",ov:false},
  {name:"Mehta & Sons",      rev:"₹6.15 L", out:"₹42,000",ov:false},
];

export const BOOKINGS=[
  {id:"SF/2026/0042",cust:"Sharma Ent.",  type:"Flight",  amt:"₹52,170",   st:"Paid"},
  {id:"SH/2026/0018",cust:"Mehta & Sons", type:"Holiday", amt:"₹2,72,800", st:"Partial"},
  {id:"SHT/2026/021",cust:"Apex Pharma",  type:"Hotel",   amt:"₹49,560",   st:"Paid"},
  {id:"SV/2026/0008",cust:"Rohan",  type:"Visa",    amt:"₹21,950",   st:"Pending"},
  {id:"SC/2026/0011",cust:"Globex",type:"Car",amt:"14,490",st:"Paid"},
]
/* ── Ticket registry — for unmatched ticket detection ─────────────
   SALES_TICKETS: every flight ticket raised on a sales voucher
   PURCH_TICKETS: every ticket entered on a purchase / BSP voucher
   Matching key: ticket number (unique per IATA ticket)
   ─────────────────────────────────────────────────────────────── */

export const SALES_TICKETS=[
  /* BOM branch */
  {branch:"BOM",vno:"BOM/1726/SF00042",date:"2026-05-05",passenger:"Mr. Rajiv Sharma",   pp:"Z1234567",ticket:"098-2156789012",airline:"Air India",   sector:"BOM-DXB",cls:"Economy",saleAmt:26085,customer:"Sharma Enterprises"},
  {branch:"BOM",vno:"BOM/1726/SF00042",date:"2026-05-05",passenger:"Mrs. Rohan",  pp:"Z1234568",ticket:"098-2156789013",airline:"Air India",   sector:"BOM-DXB",cls:"Economy",saleAmt:26085,customer:"Sharma Enterprises"},
  {branch:"BOM",vno:"BOM/1726/SF00043",date:"2026-05-07",passenger:"Mr. Anil Mehta",     pp:"M2345678",ticket:"176-4521890123",airline:"Emirates",    sector:"BOM-DXB",cls:"Business",saleAmt:87500,customer:"Mehta & Sons"},
  {branch:"BOM",vno:"BOM/1726/SF00044",date:"2026-05-09",passenger:"Ms. Rohan",    pp:"K3456789",ticket:"083-7891234560",airline:"IndiGo",      sector:"BOM-DEL",cls:"Economy",saleAmt:8420, customer:"Rohan"},
  {branch:"BOM",vno:"BOM/1726/SF00044",date:"2026-05-09",passenger:"Mr. Suresh Iyer",    pp:"K3456790",ticket:"083-7891234561",airline:"IndiGo",      sector:"BOM-DEL",cls:"Economy",saleAmt:8420, customer:"Rohan"},
  {branch:"BOM",vno:"BOM/1726/SF00045",date:"2026-05-11",passenger:"Mr. Ravi Patel",     pp:"P4567890",ticket:"157-3214567890",airline:"Air Arabia",  sector:"BOM-SHJ",cls:"Economy",saleAmt:14200,customer:"Patel Group"},
  {branch:"BOM",vno:"BOM/1726/SF00046",date:"2026-05-13",passenger:"Ms. Anita Desai",    pp:"D5678901",ticket:"098-2156789020",airline:"Air India",   sector:"BOM-LHR",cls:"Economy",saleAmt:52400,customer:"Globex Consulting"},
  {branch:"BOM",vno:"BOM/1726/SF00047",date:"2026-05-15",passenger:"Mr. Vikram Shah",    pp:"S6789012",ticket:"176-4521890130",airline:"Emirates",    sector:"BOM-DXB",cls:"Economy",saleAmt:32100,customer:"Nexus Industries"},
  /* AMD branch */
  {branch:"AMD",vno:"AMD/1726/SF00031",date:"2026-05-04",passenger:"Mr. Jayesh Patel",   pp:"P7890123",ticket:"098-3214567891",airline:"Air India",   sector:"AMD-BOM",cls:"Economy",saleAmt:6800, customer:"Patel Exports"},
  {branch:"AMD",vno:"AMD/1726/SF00032",date:"2026-05-08",passenger:"Ms. Rohan",     pp:"S8901234",ticket:"176-5632109876",airline:"Emirates",    sector:"AMD-DXB",cls:"Economy",saleAmt:28400,customer:"Gujarat Ceramics"},
  {branch:"AMD",vno:"AMD/1726/SF00033",date:"2026-05-12",passenger:"Mr. Mukesh Agarwal", pp:"A9012345",ticket:"083-8901234567",airline:"IndiGo",      sector:"AMD-DEL",cls:"Economy",saleAmt:5200, customer:"Torrent Group"},
  /* NBO branch */
  {branch:"NBO",vno:"NBO/1726/SF00021",date:"2026-05-03",passenger:"Mr. James Kamau",    pp:"KE1234567",ticket:"074-1234567890",airline:"Kenya Airways",sector:"NBO-DXB",cls:"Economy",saleAmt:580000,customer:"Kenya Airways Corp."},
  {branch:"NBO",vno:"NBO/1726/SF00022",date:"2026-05-06",passenger:"Ms. Mujeet",  pp:"KE2345678",ticket:"074-2345678901",airline:"Qatar Airways",sector:"NBO-DOH",cls:"Business",saleAmt:920000,customer:"Maasai Mara Tours"},
  /* DAR branch */
  {branch:"DAR",vno:"DAR/1726/SF00018",date:"2026-05-05",passenger:"Mr. Ali Hassan",     pp:"TZ1234567",ticket:"197-1234567890",airline:"Ethiopian",  sector:"DAR-ADD",cls:"Economy",saleAmt:4200000,customer:"Serengeti Safaris"},
  {branch:"DAR",vno:"DAR/1726/SF00019",date:"2026-05-10",passenger:"Ms. Fatuma Said",    pp:"TZ2345678",ticket:"197-2345678901",airline:"Kenya Airways",sector:"DAR-NBO",cls:"Economy",saleAmt:1800000,customer:"Tanzania Tours Co."},
  /* FBM branch */
  {branch:"FBM",vno:"FBM/1726/SF00018",date:"2026-05-04",passenger:"Mr. Pierre Kabila",  pp:"CD1234567",ticket:"243-1234567890",airline:"Ethiopian",  sector:"FBM-ADD",cls:"Economy",saleAmt:28400,customer:"Katanga Mining Ltd."},
];


export const PURCH_TICKETS=[
  /* BOM — matched */
  {branch:"BOM",vno:"BOM/1726/PF00042",date:"2026-05-07",ticket:"098-2156789012",airline:"Air India",   supplier:"BSP India",    cost:21000,taxes:4200},
  {branch:"BOM",vno:"BOM/1726/PF00042",date:"2026-05-07",ticket:"098-2156789013",airline:"Air India",   supplier:"BSP India",    cost:21000,taxes:4200},
  {branch:"BOM",vno:"BOM/1726/PF00043",date:"2026-05-09",ticket:"176-4521890123",airline:"Emirates",    supplier:"Emirates GSA",  cost:72000,taxes:8200},
  /* BOM — 083-789... IndiGo tickets NOT purchased yet (unmatched) */
  /* BOM — 157-321... Air Arabia NOT purchased (unmatched) */
  {branch:"BOM",vno:"BOM/1726/PF00044",date:"2026-05-13",ticket:"098-2156789020",airline:"Air India",   supplier:"BSP India",    cost:44000,taxes:5800},
  /* BOM — 176-452...0130 Emirates NOT purchased (unmatched) */
  /* AMD — matched */
  {branch:"AMD",vno:"AMD/1726/PF00031",date:"2026-05-06",ticket:"098-3214567891",airline:"Air India",   supplier:"BSP India",    cost:5800, taxes:680},
  /* AMD — 176-563... Emirates NOT purchased (unmatched) */
  {branch:"AMD",vno:"AMD/1726/PF00033",date:"2026-05-14",ticket:"083-8901234567",airline:"IndiGo",      supplier:"IndiGo Direct", cost:4400, taxes:520},
  /* NBO — matched */
  {branch:"NBO",vno:"NBO/1726/PF00021",date:"2026-05-05",ticket:"074-1234567890",airline:"Kenya Airways",supplier:"KQ Direct",   cost:480000,taxes:42000},
  /* NBO — 074-234... Qatar NOT purchased (unmatched) */
  /* DAR — matched */
  {branch:"DAR",vno:"DAR/1726/PF00018",date:"2026-05-07",ticket:"197-1234567890",airline:"Ethiopian",   supplier:"ET GSA Dar",   cost:3600000,taxes:290000},
  /* DAR — 197-234... Kenya Airways NOT purchased (unmatched) */
  /* FBM — NOT purchased (unmatched) */
];

/* ══ Shared utility functions & style constants ══════════════════ */

/* Number formatter */

export const MODULE_ICONS={
  Flight:"✈",Holiday:"🌴",Hotel:"🏨",Car:"🚗",
  Visa:"🛂",Insurance:"🛡",Misc:"📦",
};

/* Booking status styles */

export const PURCHASE_REGISTRY={
  PF:[
    {vno:"BOM/1726/PF00042",branch:"BOM",date:"2026-05-07",supplier:"BSP India / Air India",   ref:"098-2156789012",desc:"Air India BOM-DXB Rajiv Sharma",        amt:21000,  settled:true},
    {vno:"BOM/1726/PF00042",branch:"BOM",date:"2026-05-07",supplier:"BSP India / Air India",   ref:"098-2156789013",desc:"Air India BOM-DXB Rohan",         amt:21000,  settled:true},
    {vno:"BOM/1726/PF00043",branch:"BOM",date:"2026-05-09",supplier:"Emirates GSA",            ref:"176-4521890123",desc:"Emirates BOM-DXB Business Anil Mehta",   amt:72000,  settled:true},
    {vno:"BOM/1726/PF00044",branch:"BOM",date:"2026-05-13",supplier:"BSP India / Air India",   ref:"098-2156789020",desc:"Air India BOM-LHR Anita Desai",          amt:44000,  settled:true},
    {vno:"BOM/1726/PF00045",branch:"BOM",date:"2026-05-16",supplier:"BSP India / IndiGo",      ref:"083-7891234562",desc:"IndiGo BOM-BLR economy",                 amt:5800,   settled:false},
    {vno:"BOM/1726/PF00046",branch:"BOM",date:"2026-05-17",supplier:"BSP India / Air Arabia",  ref:"157-3214567899",desc:"Air Arabia BOM-SHJ economy",             amt:9200,   settled:false},
    {vno:"AMD/1726/PF00031",branch:"AMD",date:"2026-05-06",supplier:"BSP India / Air India",   ref:"098-3214567891",desc:"Air India AMD-BOM Jayesh Patel",          amt:5800,   settled:true},
    {vno:"AMD/1726/PF00032",branch:"AMD",date:"2026-05-10",supplier:"BSP India / IndiGo",      ref:"083-8901234567",desc:"IndiGo AMD-DEL economy",                 amt:4400,   settled:true},
    {vno:"AMD/1726/PF00033",branch:"AMD",date:"2026-05-14",supplier:"Emirates GSA",            ref:"176-5632109877",desc:"Emirates AMD-DXB economy",               amt:23000,  settled:false},
    {vno:"AMD/1726/PF00034",branch:"AMD",date:"2026-05-16",supplier:"BSP India / Air India",   ref:"098-3214567893",desc:"Air India AMD-DEL economy",              amt:5200,   settled:false},
    {vno:"NBO/1726/PF00021",branch:"NBO",date:"2026-05-05",supplier:"KQ Direct",               ref:"074-1234567890",desc:"Kenya Airways NBO-DXB economy",         amt:480000, settled:true},
    {vno:"NBO/1726/PF00022",branch:"NBO",date:"2026-05-08",supplier:"Qatar GSA",               ref:"074-2345678902",desc:"Qatar Airways NBO-DOH economy",         amt:680000, settled:false},
    {vno:"DAR/1726/PF00018",branch:"DAR",date:"2026-05-07",supplier:"ET GSA Dar",              ref:"197-1234567890",desc:"Ethiopian Airlines DAR-ADD",             amt:3600000,settled:true},
    {vno:"DAR/1726/PF00019",branch:"DAR",date:"2026-05-12",supplier:"KQ GSA Dar",              ref:"197-2345678902",desc:"Kenya Airways DAR-NBO economy",         amt:1600000,settled:false},
    {vno:"FBM/1726/PF00018",branch:"FBM",date:"2026-05-06",supplier:"ET GSA FBM",              ref:"243-1234567891",desc:"Ethiopian FBM-ADD economy",             amt:2400,   settled:false},
  ],
  PH:[
    {vno:"BOM/1726/PH00018",branch:"BOM",date:"2026-05-12",supplier:"Bali Tours DMC",          ref:"FILE-2026-0441",desc:"Bali 7N 2 pax",                          amt:140000, settled:true},
    {vno:"BOM/1726/PH00019",branch:"BOM",date:"2026-05-16",supplier:"Dubai DMC Co.",           ref:"FILE-2026-0445",desc:"Dubai 4N 2 pax",                         amt:98000,  settled:false},
    {vno:"BOM/1726/PH00020",branch:"BOM",date:"2026-05-17",supplier:"Singapore MICE DMC",      ref:"FILE-2026-0446",desc:"Singapore MICE 20 pax",                  amt:1200000,settled:false},
    {vno:"AMD/1726/PH00012",branch:"AMD",date:"2026-05-10",supplier:"Island Escapes DMC",      ref:"FILE-AMD-0201", desc:"Maldives 5N 2 pax",                      amt:110000, settled:true},
    {vno:"AMD/1726/PH00013",branch:"AMD",date:"2026-05-15",supplier:"Thailand DMC Partner",    ref:"FILE-AMD-0203", desc:"Thailand 7N 3 pax",                      amt:180000, settled:false},
    {vno:"NBO/1726/PH00010",branch:"NBO",date:"2026-05-08",supplier:"Maasai Mara Safaris",     ref:"FILE-NBO-0102", desc:"Maasai Mara 3N 4 pax",                  amt:2600000,settled:false},
    {vno:"DAR/1726/PH00008",branch:"DAR",date:"2026-05-11",supplier:"Zanzibar Beach DMC",      ref:"FILE-DAR-0082", desc:"Zanzibar 4N beach package",              amt:10500000,settled:false},
    {vno:"FBM/1726/PH00006",branch:"FBM",date:"2026-05-07",supplier:"DRC Safari Operator",     ref:"FILE-FBM-0042", desc:"DRC Safari 5N 2 pax",                   amt:6800,   settled:false},
  ],
  PHT:[
    {vno:"BOM/1726/PHT0021",branch:"BOM",date:"2026-05-13",supplier:"Hyatt Hotels AMD",        ref:"HTL-HYD-AMD-605",desc:"Hyatt AMD 2 rooms 3N",                  amt:48000,  settled:true},
    {vno:"BOM/1726/PHT0022",branch:"BOM",date:"2026-05-15",supplier:"ITC Hotels Ltd.",         ref:"HTL-ITC-BOM-614",desc:"ITC Grand BOM 1 room 2N",               amt:32000,  settled:false},
    {vno:"BOM/1726/PHT0023",branch:"BOM",date:"2026-05-16",supplier:"Taj Hotels",              ref:"HTL-TAJ-GOA-102",desc:"Taj Goa 1 suite 3N",                    amt:58000,  settled:false},
    {vno:"AMD/1726/PHT0010",branch:"AMD",date:"2026-05-12",supplier:"Radisson AMD",            ref:"HTL-RAD-AMD-510",desc:"Radisson AMD 3 rooms 2N",               amt:36000,  settled:false},
    {vno:"NBO/1726/PHT0008",branch:"NBO",date:"2026-05-09",supplier:"Nairobi Serena Hotel",    ref:"HTL-SER-NBO-508",desc:"Serena NBO 2 rooms 3N",                amt:950000, settled:false},
    {vno:"NBO/1726/PHT0009",branch:"NBO",date:"2026-05-11",supplier:"Tribe Hotel Nairobi",     ref:"HTL-TRB-NBO-411",desc:"Tribe Hotel 1 room 2N",                amt:680000, settled:false},
    {vno:"DAR/1726/PHT0007",branch:"DAR",date:"2026-05-12",supplier:"Hyatt Regency Dar",       ref:"HTL-HYT-DAR-507",desc:"Hyatt 2 rooms 3N exec floor",           amt:4800000,settled:false},
    {vno:"FBM/1726/PHT0004",branch:"FBM",date:"2026-05-11",supplier:"Karavia Hotel FBM",       ref:"HTL-KRV-FBM-311",desc:"Karavia Hotel 2 rooms 3N",              amt:1800,   settled:false},
  ],
  PC:[
    {vno:"BOM/1726/PC00008",branch:"BOM",date:"2026-05-14",supplier:"Riya Travels & Tours",    ref:"CAR-BOM-INV-001",desc:"Innova Crysta 3 days BOM-Pune",          amt:12000,  settled:true},
    {vno:"BOM/1726/PC00009",branch:"BOM",date:"2026-05-15",supplier:"Sai Car Rentals",         ref:"CAR-BOM-INV-003",desc:"Tempo Traveller 1 day local",            amt:14000,  settled:false},
    {vno:"BOM/1726/PC00010",branch:"BOM",date:"2026-05-16",supplier:"Ace Cabs",                ref:"CAR-BOM-INV-004",desc:"Sedan 5 days BOM-PNE-BOM",              amt:9500,   settled:false},
    {vno:"AMD/1726/PC00007",branch:"AMD",date:"2026-05-12",supplier:"Patel Car Hire",          ref:"CAR-AMD-INV-002",desc:"Ertiga 3 days AMD city",                 amt:8000,   settled:false},
    {vno:"NBO/1726/PC00009",branch:"NBO",date:"2026-05-10",supplier:"Kenya Car Hire",          ref:"CAR-NBO-INV-002",desc:"Land Cruiser 4 days Nairobi",           amt:740000, settled:false},
    {vno:"DAR/1726/PC00006",branch:"DAR",date:"2026-05-09",supplier:"Dar Transport Co.",       ref:"CAR-DAR-INV-002",desc:"Coaster 2 days safari transfer",        amt:1900000,settled:false},
    {vno:"DAR/1726/PC00007",branch:"DAR",date:"2026-05-14",supplier:"Serengeti Transfer Co.",  ref:"CAR-DAR-INV-003",desc:"Land Cruiser 4 days Serengeti",         amt:2800000,settled:false},
    {vno:"FBM/1726/PC00005",branch:"FBM",date:"2026-05-10",supplier:"Katanga Car Hire",        ref:"CAR-FBM-INV-001",desc:"Toyota Prado 3 days Lubumbashi",        amt:1200,   settled:false},
  ],
  PV:[
    {vno:"BOM/1726/PV00009",branch:"BOM",date:"2026-05-13",supplier:"VFS Global — UAE",        ref:"PP-Z1234567",    desc:"UAE Tourist Visa Rajiv Sharma",          amt:6600,   settled:true},
    {vno:"BOM/1726/PV00009",branch:"BOM",date:"2026-05-13",supplier:"VFS Global — UAE",        ref:"PP-Z1234568",    desc:"UAE Tourist Visa Rohan",          amt:6600,   settled:true},
    {vno:"BOM/1726/PV00010",branch:"BOM",date:"2026-05-15",supplier:"VFS UK / BLS",            ref:"PP-M2345679",    desc:"UK Visit Visa Rohan",              amt:15200,  settled:false},
    {vno:"BOM/1726/PV00011",branch:"BOM",date:"2026-05-16",supplier:"CVAC — Schengen",         ref:"PP-A9012346",    desc:"Schengen Visa 3 applicants",             amt:18900,  settled:false},
    {vno:"AMD/1726/PV00005",branch:"AMD",date:"2026-05-11",supplier:"VFS Global — UAE",        ref:"PP-P7890124",    desc:"UAE Visa Patel family",                  amt:9800,   settled:false},
    {vno:"NBO/1726/PV00004",branch:"NBO",date:"2026-05-08",supplier:"UAE Embassy Nairobi",     ref:"PP-KE2345679",   desc:"UAE Visa Mujeet",                amt:200000, settled:false},
    {vno:"NBO/1726/PV00005",branch:"NBO",date:"2026-05-13",supplier:"UK Visa App Centre NBO",  ref:"PP-KE3456789",   desc:"UK Visit James Kamau",                  amt:320000, settled:false},
    {vno:"DAR/1726/PV00005",branch:"DAR",date:"2026-05-09",supplier:"UAE Embassy Dar",         ref:"PP-TZ1234568",   desc:"UAE Tourist Visa Ali Hassan",            amt:380000, settled:false},
    {vno:"DAR/1726/PV00006",branch:"DAR",date:"2026-05-13",supplier:"VFS Tanzania — Schengen", ref:"PP-TZ2345679",   desc:"Schengen Visa Fatuma Said",              amt:480000, settled:false},
    {vno:"FBM/1726/PV00003",branch:"FBM",date:"2026-05-08",supplier:"UAE Embassy Kinshasa",    ref:"PP-CD1234568",   desc:"UAE Visa Pierre Kabila",                 amt:320,    settled:false},
  ],
  PI:[
    {vno:"BOM/1726/PI00005",branch:"BOM",date:"2026-05-11",supplier:"TATA AIG General",        ref:"INS-PP-Z1234567",desc:"Travel Guard Rajiv Sharma",              amt:3500,   settled:true},
    {vno:"BOM/1726/PI00006",branch:"BOM",date:"2026-05-14",supplier:"Bajaj Allianz",           ref:"INS-PP-S6789013",desc:"Travel Guard Vikram Shah",               amt:2900,   settled:false},
    {vno:"BOM/1726/PI00007",branch:"BOM",date:"2026-05-16",supplier:"TATA AIG General",        ref:"INS-PP-M2345679",desc:"Travel Guard Rohan",               amt:3200,   settled:false},
    {vno:"AMD/1726/PI00003",branch:"AMD",date:"2026-05-13",supplier:"TATA AIG General",        ref:"INS-PP-P7890124",desc:"Travel Guard Patel family",              amt:4800,   settled:false},
    {vno:"NBO/1726/PI00002",branch:"NBO",date:"2026-05-09",supplier:"Jubilee Insurance",       ref:"INS-PP-KE123456",desc:"Travel Insurance safari group",         amt:120000, settled:false},
    {vno:"DAR/1726/PI00003",branch:"DAR",date:"2026-05-10",supplier:"Jubilee Ins Tanzania",    ref:"INS-PP-TZ123456",desc:"Travel Insurance Ali Hassan",            amt:780000, settled:false},
    {vno:"FBM/1726/PI00002",branch:"FBM",date:"2026-05-09",supplier:"AAR Insurance DRC",       ref:"INS-PP-CD123456",desc:"Travel Insurance Pierre Kabila",         amt:280,    settled:false},
  ],
  PM:[
    {vno:"BOM/1726/PM00011",branch:"BOM",date:"2026-05-16",supplier:"Airtel Business",         ref:"MISC-BOM-001",   desc:"SIM cards x10 Airtel International",    amt:8500,   settled:true},
    {vno:"BOM/1726/PM00012",branch:"BOM",date:"2026-05-17",supplier:"Blue Dart Courier",       ref:"MISC-BOM-004",   desc:"Courier document delivery",             amt:650,    settled:false},
    {vno:"BOM/1726/PM00013",branch:"BOM",date:"2026-05-17",supplier:"GoAir Ground Handling",   ref:"MISC-BOM-005",   desc:"Airport assistance VIP lounge",         amt:4200,   settled:false},
    {vno:"AMD/1726/PM00006",branch:"AMD",date:"2026-05-15",supplier:"Quick Print Studio",      ref:"MISC-AMD-002",   desc:"Visa photos attestation",               amt:1100,   settled:false},
    {vno:"NBO/1726/PM00003",branch:"NBO",date:"2026-05-13",supplier:"Wilson Airport Taxi",     ref:"MISC-NBO-002",   desc:"Airport transfer Nairobi",             amt:52000,  settled:false},
    {vno:"NBO/1726/PM00004",branch:"NBO",date:"2026-05-16",supplier:"Safaricom Business",      ref:"MISC-NBO-003",   desc:"Safaricom SIM cards x6",               amt:18000,  settled:false},
    {vno:"DAR/1726/PM00003",branch:"DAR",date:"2026-05-11",supplier:"TTCL Tanzania",           ref:"MISC-DAR-001",   desc:"Travel SIM cards x4 Dar",              amt:120000, settled:false},
    {vno:"DAR/1726/PM00004",branch:"DAR",date:"2026-05-14",supplier:"Dar Airport Transfers",   ref:"MISC-DAR-002",   desc:"Airport transfer Julius Nyerere",       amt:180000, settled:false},
    {vno:"FBM/1726/PM00003",branch:"FBM",date:"2026-05-10",supplier:"Airtel DRC Business",     ref:"MISC-FBM-002",   desc:"SIM cards x4 Lubumbashi",               amt:180,    settled:false},
  ],
};


export const SALE_TO_PURCH_MOD={SF:"PF",SH:"PH",SHT:"PHT",SC:"PC",SV:"PV",SI:"PI",SM:"PM"};

/* ══ TWO-LAYER UNMATCHED SYSTEM ══════════════════════════════════
   Layer 1 — Prevention: PurchaseLinkField dropdown at creation
     → on Save with link: marks purchase settled:true
     → removed from Available list immediately
   Layer 2 — Detection: retrospective panel on Dashboard
     → Source A: PURCHASE_REGISTRY entries still settled:false
     → Source B: _UNLINKED_SALES (sales saved without linking)
   ════════════════════════════════════════════════════════════════ */


export const _UNLINKED_SALES=[];

export const _SAVE_LISTENERS=new Set();

export const _MOD_KEY={Flight:"PF",Holiday:"PH",Hotel:"PHT",Car:"PC",Visa:"PV",Insurance:"PI",Misc:"PM"};

export const REC_D=[
  {party:"Sharma Enterprises",total:272800,d0_30:272800,d30_60:0,d60_90:0,d90p:0},
  {party:"Apex Pharma Ltd.",total:180000,d0_30:0,d30_60:180000,d60_90:0,d90p:0},
  {party:"Globex Consulting",total:340000,d0_30:0,d30_60:0,d60_90:120000,d90p:220000},
  {party:"Nexus Industries",total:85000,d0_30:85000,d30_60:0,d60_90:0,d90p:0},
  {party:"Mehta & Sons",total:42000,d0_30:42000,d30_60:0,d60_90:0,d90p:0},
];

export const GP_BILLS=[
  /* ── FLIGHTS ── */
  {id:"BOM/0825/SF00031",date:"2025-12-04",mod:"Flight",  airline:"Air India",   dest:"Dubai",       client:"Sharma Enterprises",supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:48200,cost:41000,branch_cur:"INR"},
  {id:"BOM/0825/SF00034",date:"2025-12-11",mod:"Flight",  airline:"Emirates",    dest:"Dubai",       client:"Mehta & Sons",      supplier:"Emirates GSA",branch:"BOM",consultant:"Priya S",sell:84000,cost:69000,branch_cur:"INR"},
  {id:"BOM/0826/SF00038",date:"2026-01-06",mod:"Flight",  airline:"Air India",   dest:"London",      client:"Rohan",       supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:52000,cost:43500,branch_cur:"INR"},
  {id:"BOM/0826/SF00041",date:"2026-01-14",mod:"Flight",  airline:"Qatar Airways",dest:"Doha",       client:"TechCorp MICE",    supplier:"BSP India",   branch:"BOM",consultant:"Amit K",sell:62000,cost:51000,branch_cur:"INR"},
  {id:"AMD/0826/SF00022",date:"2026-01-09",mod:"Flight",  airline:"IndiGo",      dest:"Delhi",       client:"Gujarat Ceramics",  supplier:"BSP India",   branch:"AMD",consultant:"Neha P",sell:8800, cost:7600, branch_cur:"INR"},
  {id:"AMD/0826/SF00024",date:"2026-02-03",mod:"Flight",  airline:"Air India",   dest:"Dubai",       client:"Patel Exports",     supplier:"Emirates GSA",branch:"AMD",consultant:"Neha P",sell:26000,cost:21500,branch_cur:"INR"},
  {id:"BOM/0826/SF00039",date:"2026-02-11",mod:"Flight",  airline:"Air Arabia",  dest:"Sharjah",     client:"Globex Consulting", supplier:"BSP India",   branch:"BOM",consultant:"Priya S",sell:18400,cost:15200,branch_cur:"INR"},
  {id:"BOM/0826/SF00040",date:"2026-02-18",mod:"Flight",  airline:"Lufthansa",   dest:"Frankfurt",   client:"Apex Pharma",       supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:71000,cost:58000,branch_cur:"INR"},
  {id:"NBO/0826/SF00015",date:"2026-02-07",mod:"Flight",  airline:"Kenya Airways",dest:"Dubai",      client:"James Kamau",       supplier:"KQ Direct",   branch:"NBO",consultant:"Kevin O",sell:680000,cost:560000,branch_cur:"KES"},
  {id:"NBO/0826/SF00017",date:"2026-03-02",mod:"Flight",  airline:"Qatar Airways",dest:"Doha",       client:"Mujeet",     supplier:"BSP Nairobi", branch:"NBO",consultant:"Kevin O",sell:840000,cost:700000,branch_cur:"KES"},
  {id:"BOM/0826/SF00042",date:"2026-03-05",mod:"Flight",  airline:"Air India",   dest:"Dubai",       client:"Sharma Enterprises",supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:52170,cost:44000,branch_cur:"INR"},
  {id:"BOM/0826/SF00043",date:"2026-03-07",mod:"Flight",  airline:"Emirates",    dest:"Dubai",       client:"Mehta & Sons",      supplier:"Emirates GSA",branch:"BOM",consultant:"Priya S",sell:92000,cost:76000,branch_cur:"INR"},
  {id:"BOM/0826/SF00044",date:"2026-03-09",mod:"Flight",  airline:"Air India",   dest:"London",      client:"Rohan",       supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:54000,cost:44000,branch_cur:"INR"},
  {id:"AMD/0826/SF00031",date:"2026-03-04",mod:"Flight",  airline:"Air India",   dest:"Delhi",       client:"Patel Exports",     supplier:"BSP India",   branch:"AMD",consultant:"Neha P",sell:10200,cost:8800, branch_cur:"INR"},
  {id:"AMD/0826/SF00032",date:"2026-03-08",mod:"Flight",  airline:"IndiGo",      dest:"Delhi",       client:"Gujarat Ceramics",  supplier:"BSP India",   branch:"AMD",consultant:"Neha P",sell:7800, cost:6600, branch_cur:"INR"},
  {id:"DAR/0826/SF00018",date:"2026-03-05",mod:"Flight",  airline:"Ethiopian",   dest:"Addis Ababa", client:"Ali Hassan",        supplier:"ET GSA Dar",  branch:"DAR",consultant:"Amina H",sell:4200000,cost:3600000,branch_cur:"TZS"},
  {id:"BOM/0826/SF00045",date:"2026-04-11",mod:"Flight",  airline:"Air Arabia",  dest:"Sharjah",     client:"Globex Consulting", supplier:"BSP India",   branch:"BOM",consultant:"Priya S",sell:19600,cost:16000,branch_cur:"INR"},
  {id:"BOM/0826/SF00046",date:"2026-04-13",mod:"Flight",  airline:"British Airways",dest:"London",   client:"Apex Pharma",       supplier:"BSP India",   branch:"BOM",consultant:"Amit K",sell:78000,cost:64000,branch_cur:"INR"},
  {id:"FBM/0826/SF00012",date:"2026-04-06",mod:"Flight",  airline:"Ethiopian",   dest:"Addis Ababa", client:"Pierre Kabila",     supplier:"ET GSA FBM",  branch:"FBM",consultant:"Sujeet",sell:2600,cost:2100,branch_cur:"USD"},
  {id:"NBO/0826/SF00021",date:"2026-05-03",mod:"Flight",  airline:"Kenya Airways",dest:"Dubai",      client:"James Kamau",       supplier:"KQ Direct",   branch:"NBO",consultant:"Kevin O",sell:920000,cost:760000,branch_cur:"KES"},
  {id:"BOM/1726/SF00042",date:"2026-05-05",mod:"Flight",  airline:"Air India",   dest:"Dubai",       client:"Sharma Enterprises",supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:52170,cost:44000,branch_cur:"INR"},
  {id:"BOM/1726/SF00043",date:"2026-05-07",mod:"Flight",  airline:"Emirates",    dest:"Dubai",       client:"Mehta & Sons",      supplier:"Emirates GSA",branch:"BOM",consultant:"Priya S",sell:94500,cost:78000,branch_cur:"INR"},
  {id:"BOM/1726/SF00044",date:"2026-05-09",mod:"Flight",  airline:"Air India",   dest:"London",      client:"Rohan",       supplier:"BSP India",   branch:"BOM",consultant:"Rahul M",sell:56000,cost:45500,branch_cur:"INR"},
  {id:"AMD/1726/SF00031",date:"2026-05-04",mod:"Flight",  airline:"Air India",   dest:"Delhi",       client:"Patel Exports",     supplier:"BSP India",   branch:"AMD",consultant:"Neha P",sell:10800,cost:9200, branch_cur:"INR"},
  {id:"AMD/1726/SF00032",date:"2026-05-08",mod:"Flight",  airline:"IndiGo",      dest:"Delhi",       client:"Gujarat Ceramics",  supplier:"BSP India",   branch:"AMD",consultant:"Neha P",sell:8200, cost:7000, branch_cur:"INR"},
  {id:"BOM/1726/SF00045",date:"2026-05-11",mod:"Flight",  airline:"Air Arabia",  dest:"Sharjah",     client:"Globex Consulting", supplier:"BSP India",   branch:"BOM",consultant:"Priya S",sell:18900,cost:15500,branch_cur:"INR"},
  {id:"DAR/1726/SF00018",date:"2026-05-05",mod:"Flight",  airline:"Ethiopian",   dest:"Addis Ababa", client:"Ali Hassan",        supplier:"ET GSA Dar",  branch:"DAR",consultant:"Amina H",sell:4600000,cost:3900000,branch_cur:"TZS"},
  /* ── HOLIDAYS ── */
  {id:"BOM/0825/SH00010",date:"2025-12-08",mod:"Holiday", airline:"",dest:"Thailand",    client:"Nexus Industries",   supplier:"Thailand DMC",branch:"BOM",consultant:"Priya S",sell:186000,cost:148000,branch_cur:"INR"},
  {id:"BOM/0826/SH00012",date:"2026-01-15",mod:"Holiday", airline:"",dest:"Maldives",    client:"Sharma Enterprises", supplier:"Island Escapes",branch:"BOM",consultant:"Rahul M",sell:245000,cost:192000,branch_cur:"INR"},
  {id:"AMD/0826/SH00008",date:"2026-01-22",mod:"Holiday", airline:"",dest:"Thailand",    client:"Patel Exports",      supplier:"Thailand DMC",  branch:"AMD",consultant:"Neha P",sell:168000,cost:132000,branch_cur:"INR"},
  {id:"BOM/0826/SH00014",date:"2026-02-05",mod:"Holiday", airline:"",dest:"Dubai",       client:"Mehta & Sons",       supplier:"Dubai Wonders",  branch:"BOM",consultant:"Priya S",sell:98000, cost:76000, branch_cur:"INR"},
  {id:"BOM/0826/SH00016",date:"2026-02-14",mod:"Holiday", airline:"",dest:"Bali",        client:"Globex Consulting",  supplier:"Bali Tours DMC", branch:"BOM",consultant:"Amit K",sell:165000,cost:128000,branch_cur:"INR"},
  {id:"NBO/0826/SH00007",date:"2026-02-18",mod:"Holiday", airline:"",dest:"Maasai Mara", client:"Mujeet",      supplier:"Maasai Safaris", branch:"NBO",consultant:"Kevin O",sell:3800000,cost:2900000,branch_cur:"KES"},
  {id:"BOM/0826/SH00017",date:"2026-03-12",mod:"Holiday", airline:"",dest:"Singapore",   client:"TechCorp MICE",      supplier:"Singapore MICE", branch:"BOM",consultant:"Amit K",sell:1450000,cost:1140000,branch_cur:"INR"},
  {id:"BOM/0826/SH00018",date:"2026-03-14",mod:"Holiday", airline:"",dest:"Bali",        client:"Mehta & Sons",       supplier:"Bali Tours DMC", branch:"BOM",consultant:"Priya S",sell:182000,cost:142000,branch_cur:"INR"},
  {id:"AMD/0826/SH00010",date:"2026-03-20",mod:"Holiday", airline:"",dest:"Maldives",    client:"Gujarat Ceramics",   supplier:"Island Escapes", branch:"AMD",consultant:"Neha P",sell:220000,cost:172000,branch_cur:"INR"},
  {id:"DAR/0826/SH00005",date:"2026-03-11",mod:"Holiday", airline:"",dest:"Zanzibar",    client:"Ali Hassan",         supplier:"Zanzibar DMC",   branch:"DAR",consultant:"Amina H",sell:8800000,cost:6900000,branch_cur:"TZS"},
  {id:"FBM/0826/SH00004",date:"2026-04-07",mod:"Holiday", airline:"",dest:"DRC Safari",  client:"Pierre Kabila",      supplier:"DRC Operator",   branch:"FBM",consultant:"Sujeet",sell:7400, cost:5800, branch_cur:"USD"},
  {id:"BOM/1726/SH00018",date:"2026-05-12",mod:"Holiday", airline:"",dest:"Bali",        client:"Mehta & Sons",       supplier:"Bali Tours DMC", branch:"BOM",consultant:"Priya S",sell:272800,cost:214000,branch_cur:"INR"},
  {id:"BOM/1726/SH00019",date:"2026-05-14",mod:"Holiday", airline:"",dest:"Dubai",       client:"Sharma Enterprises", supplier:"Dubai Wonders",  branch:"BOM",consultant:"Rahul M",sell:116000,cost:90000, branch_cur:"INR"},
  {id:"BOM/1726/SH00020",date:"2026-05-17",mod:"Holiday", airline:"",dest:"Singapore",   client:"TechCorp MICE",      supplier:"Singapore MICE", branch:"BOM",consultant:"Amit K",sell:1680000,cost:1320000,branch_cur:"INR"},
  {id:"AMD/1726/SH00012",date:"2026-05-10",mod:"Holiday", airline:"",dest:"Maldives",    client:"Patel Exports",      supplier:"Island Escapes", branch:"AMD",consultant:"Neha P",sell:248000,cost:194000,branch_cur:"INR"},
  {id:"NBO/1726/SH00010",date:"2026-05-08",mod:"Holiday", airline:"",dest:"Maasai Mara", client:"Mujeet",      supplier:"Maasai Safaris", branch:"NBO",consultant:"Kevin O",sell:4200000,cost:3200000,branch_cur:"KES"},
  {id:"DAR/1726/SH00008",date:"2026-05-11",mod:"Holiday", airline:"",dest:"Zanzibar",    client:"Fatuma Said",        supplier:"Zanzibar DMC",   branch:"DAR",consultant:"Amina H",sell:10500000,cost:8200000,branch_cur:"TZS"},
  /* ── HOTELS ── */
  {id:"BOM/0826/SHT0014",date:"2026-01-18",mod:"Hotel",airline:"",dest:"Goa",         client:"Globex Consulting", supplier:"Taj Hotels",   branch:"BOM",consultant:"Priya S",sell:58000,cost:48000,branch_cur:"INR"},
  {id:"BOM/0826/SHT0016",date:"2026-02-22",mod:"Hotel",airline:"",dest:"Mumbai",      client:"Nexus Industries",  supplier:"ITC Hotels",   branch:"BOM",consultant:"Amit K",sell:32000,cost:26000,branch_cur:"INR"},
  {id:"AMD/0826/SHT0008",date:"2026-03-05",mod:"Hotel",airline:"",dest:"Ahmedabad",   client:"Gujarat Ceramics",  supplier:"Radisson AMD", branch:"AMD",consultant:"Neha P",sell:42000,cost:34000,branch_cur:"INR"},
  {id:"NBO/0826/SHT0006",date:"2026-03-09",mod:"Hotel",airline:"",dest:"Nairobi",     client:"James Kamau",       supplier:"Serena NBO",   branch:"NBO",consultant:"Kevin O",sell:1400000,cost:1100000,branch_cur:"KES"},
  {id:"BOM/1726/SHT0021",date:"2026-05-13",mod:"Hotel",airline:"",dest:"Ahmedabad",   client:"Apex Pharma",       supplier:"Hyatt AMD",    branch:"BOM",consultant:"Rahul M",sell:49560,cost:40800,branch_cur:"INR"},
  {id:"BOM/1726/SHT0022",date:"2026-05-15",mod:"Hotel",airline:"",dest:"Mumbai",      client:"Nexus Industries",  supplier:"ITC Hotels",   branch:"BOM",consultant:"Amit K",sell:34200,cost:28000,branch_cur:"INR"},
  {id:"DAR/1726/SHT0007",date:"2026-05-12",mod:"Hotel",airline:"",dest:"Dar es Salaam",client:"Fatuma Said",      supplier:"Hyatt DAR",    branch:"DAR",consultant:"Amina H",sell:5600000,cost:4600000,branch_cur:"TZS"},
  /* ── CARS ── */
  {id:"BOM/0826/SC00005",date:"2026-01-25",mod:"Car",airline:"",dest:"Mumbai",        client:"Sharma Enterprises",supplier:"Riya Travels", branch:"BOM",consultant:"Rahul M",sell:16200,cost:12800,branch_cur:"INR"},
  {id:"BOM/0826/SC00006",date:"2026-03-18",mod:"Car",airline:"",dest:"Pune",          client:"Globex Consulting", supplier:"Riya Travels", branch:"BOM",consultant:"Priya S",sell:11400,cost:8800, branch_cur:"INR"},
  {id:"NBO/0826/SC00007",date:"2026-04-10",mod:"Car",airline:"",dest:"Nairobi",       client:"Mujeet",     supplier:"Kenya Car Hire",branch:"NBO",consultant:"Kevin O",sell:980000,cost:760000,branch_cur:"KES"},
  {id:"BOM/1726/SC00008",date:"2026-05-14",mod:"Car",airline:"",dest:"Mumbai-Pune",   client:"Globex Consulting", supplier:"Riya Travels", branch:"BOM",consultant:"Priya S",sell:14490,cost:11200,branch_cur:"INR"},
  {id:"BOM/1726/SC00009",date:"2026-05-15",mod:"Car",airline:"",dest:"Mumbai",        client:"Mehta & Sons",      supplier:"Sai Cars",     branch:"BOM",consultant:"Priya S",sell:16800,cost:13200,branch_cur:"INR"},
  {id:"DAR/1726/SC00006",date:"2026-05-09",mod:"Car",airline:"",dest:"Serengeti",     client:"Ali Hassan",        supplier:"DAR Transport", branch:"DAR",consultant:"Amina H",sell:3200000,cost:2500000,branch_cur:"TZS"},
  /* ── VISAS ── */
  {id:"BOM/0826/SV00006",date:"2026-01-20",mod:"Visa",airline:"",dest:"UAE",          client:"Sharma Enterprises",supplier:"VFS Global",   branch:"BOM",consultant:"Rahul M",sell:14800,cost:11200,branch_cur:"INR"},
  {id:"BOM/0826/SV00007",date:"2026-02-28",mod:"Visa",airline:"",dest:"UK",           client:"Mehta & Sons",      supplier:"BLS Int'l",    branch:"BOM",consultant:"Priya S",sell:32000,cost:26000,branch_cur:"INR"},
  {id:"AMD/0826/SV00003",date:"2026-03-14",mod:"Visa",airline:"",dest:"Schengen",     client:"Patel Exports",     supplier:"CVAC",         branch:"AMD",consultant:"Neha P",sell:22500,cost:17800,branch_cur:"INR"},
  {id:"NBO/0826/SV00003",date:"2026-04-08",mod:"Visa",airline:"",dest:"UAE",          client:"Mujeet",     supplier:"UAE Embassy",  branch:"NBO",consultant:"Kevin O",sell:280000,cost:220000,branch_cur:"KES"},
  {id:"BOM/1726/SV00009",date:"2026-05-13",mod:"Visa",airline:"",dest:"UAE",          client:"Sharma Enterprises",supplier:"VFS Global",   branch:"BOM",consultant:"Rahul M",sell:21950,cost:16800,branch_cur:"INR"},
  {id:"BOM/1726/SV00010",date:"2026-05-15",mod:"Visa",airline:"",dest:"UK",           client:"Rohan",       supplier:"BLS Int'l",    branch:"BOM",consultant:"Priya S",sell:34200,cost:27500,branch_cur:"INR"},
  {id:"AMD/1726/SV00005",date:"2026-05-11",mod:"Visa",airline:"",dest:"UAE",          client:"Patel Exports",     supplier:"VFS Global",   branch:"AMD",consultant:"Neha P",sell:18400,cost:14200,branch_cur:"INR"},
  {id:"NBO/1726/SV00004",date:"2026-05-08",mod:"Visa",airline:"",dest:"UAE",          client:"James Kamau",       supplier:"UAE Embassy",  branch:"NBO",consultant:"Kevin O",sell:380000,cost:300000,branch_cur:"KES"},
  /* ── INSURANCE ── */
  {id:"BOM/0826/SI00003",date:"2026-01-06",mod:"Insurance",airline:"",dest:"International",client:"Sharma Enterprises",supplier:"TATA AIG",branch:"BOM",consultant:"Rahul M",sell:4200,cost:3100,branch_cur:"INR"},
  {id:"BOM/0826/SI00004",date:"2026-03-14",mod:"Insurance",airline:"",dest:"International",client:"Globex Consulting",  supplier:"Bajaj Allianz",branch:"BOM",consultant:"Priya S",sell:3600,cost:2700,branch_cur:"INR"},
  {id:"NBO/0826/SI00002",date:"2026-04-09",mod:"Insurance",airline:"",dest:"Africa",       client:"Mujeet",      supplier:"Jubilee Ins", branch:"NBO",consultant:"Kevin O",sell:160000,cost:120000,branch_cur:"KES"},
  {id:"BOM/1726/SI00005",date:"2026-05-11",mod:"Insurance",airline:"",dest:"International",client:"Sharma Enterprises", supplier:"TATA AIG",    branch:"BOM",consultant:"Rahul M",sell:4580,cost:3400,branch_cur:"INR"},
  {id:"BOM/1726/SI00006",date:"2026-05-14",mod:"Insurance",airline:"",dest:"International",client:"Mehta & Sons",       supplier:"Bajaj Allianz",branch:"BOM",consultant:"Priya S",sell:3860,cost:2900,branch_cur:"INR"},
  {id:"AMD/1726/SI00003",date:"2026-05-13",mod:"Insurance",airline:"",dest:"International",client:"Patel Exports",      supplier:"TATA AIG",    branch:"AMD",consultant:"Neha P",sell:6200,cost:4600,branch_cur:"INR"},
  /* ── MISC ── */
  {id:"BOM/0826/SM00007",date:"2026-02-10",mod:"Misc",airline:"",dest:"International",client:"TechCorp MICE",    supplier:"Airtel Business",branch:"BOM",consultant:"Amit K",sell:14200,cost:10800,branch_cur:"INR"},
  {id:"BOM/0826/SM00009",date:"2026-04-16",mod:"Misc",airline:"",dest:"Mumbai",       client:"Sharma Enterprises",supplier:"Blue Dart",     branch:"BOM",consultant:"Rahul M",sell:1800,cost:1100,branch_cur:"INR"},
  {id:"BOM/1726/SM00011",date:"2026-05-16",mod:"Misc",airline:"",dest:"International",client:"TechCorp MICE",    supplier:"Airtel Business",branch:"BOM",consultant:"Amit K",sell:11900,cost:8800,branch_cur:"INR"},
  {id:"NBO/1726/SM00003",date:"2026-05-13",mod:"Misc",airline:"",dest:"Nairobi",      client:"James Kamau",      supplier:"Wilson Taxi",  branch:"NBO",consultant:"Kevin O",sell:72000,cost:54000,branch_cur:"KES"},
];


/* ══ ReportGP — 11 tabs ══════════════════════════════════════════ */

export const EXP_LEDGERS=[
  {id:"SAL",name:"Salaries & Wages",        group:"Staff Costs",    icon:"👥"},
  {id:"PF", name:"Provident Fund / ESI",     group:"Staff Costs",    icon:"👥"},
  {id:"RNT",name:"Office Rent",              group:"Premises",       icon:"🏢"},
  {id:"ELC",name:"Utilities (Power/Water)",  group:"Premises",       icon:"💡"},
  {id:"TEL",name:"Telephone & Internet",     group:"Communication",  icon:"📱"},
  {id:"ADV",name:"Advertising & Marketing",  group:"Marketing",      icon:"📢"},
  {id:"GDS",name:"GDS / System Charges",     group:"Operations",     icon:"💻"},
  {id:"SFT",name:"Software Subscriptions",   group:"Operations",     icon:"💻"},
  {id:"BNK",name:"Bank Charges & Forex",     group:"Finance",        icon:"🏦"},
  {id:"PRF",name:"Professional Fees",        group:"Finance",        icon:"📋"},
  {id:"TRV",name:"Travel & Conveyance",      group:"Operations",     icon:"🚗"},
  {id:"TRN",name:"Staff Training",           group:"Staff Costs",    icon:"📚"},
  {id:"PRT",name:"Printing & Stationery",    group:"Operations",     icon:"🖨"},
  {id:"INS",name:"Insurance (Company)",      group:"Finance",        icon:"🛡"},
  {id:"DEP",name:"Depreciation",             group:"Non-cash",       icon:"📉"},
  {id:"MSC",name:"Miscellaneous Expenses",   group:"Operations",     icon:"📦"},
];


export const FY_LIST=[
  {v:"2024-25",l:"FY 2024-25",months:["Apr'24","May'24","Jun'24","Jul'24","Aug'24","Sep'24","Oct'24","Nov'24","Dec'24","Jan'25","Feb'25","Mar'25"],keys:["2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03"]},
  {v:"2025-26",l:"FY 2025-26",months:["Apr'25","May'25","Jun'25","Jul'25","Aug'25","Sep'25","Oct'25","Nov'25","Dec'25","Jan'26","Feb'26","Mar'26"],keys:["2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"]},
  {v:"2026-27",l:"FY 2026-27",months:["Apr'26","May'26","Jun'26","Jul'26","Aug'26","Sep'26","Oct'26","Nov'26","Dec'26","Jan'27","Feb'27","Mar'27"],keys:["2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10","2026-11","2026-12","2027-01","2027-02","2027-03"]},
];


export const _EXP_BUDGETS={};

export const _EXP_BGT_LISTENERS=new Set();

/* ── Pre-seed budgets for all branches — FY 2025-26 & 2026-27 ── */
(()=>{
  const seeds={
    BOM:{b:{SAL:{m:150000,y:1800000},PF:{m:18000,y:216000},RNT:{m:82000,y:984000},ELC:{m:9000,y:108000},TEL:{m:12000,y:144000},ADV:{m:30000,y:360000},GDS:{m:20000,y:240000},SFT:{m:9200,y:110400},BNK:{m:6000,y:72000},PRF:{m:15000,y:180000},TRV:{m:10000,y:120000},TRN:{m:8000,y:96000},PRT:{m:2500,y:30000},INS:{m:5000,y:60000},DEP:{m:14000,y:168000},MSC:{m:5000,y:60000}}},
    AMD:{b:{SAL:{m:60000,y:720000},PF:{m:7200,y:86400},RNT:{m:28000,y:336000},ELC:{m:3500,y:42000},TEL:{m:5000,y:60000},ADV:{m:12000,y:144000},GDS:{m:8000,y:96000},SFT:{m:4600,y:55200},BNK:{m:2500,y:30000},PRF:{m:5000,y:60000},TRV:{m:4000,y:48000},TRN:{m:3000,y:36000},PRT:{m:1000,y:12000},INS:{m:2000,y:24000},DEP:{m:5500,y:66000},MSC:{m:2000,y:24000}}},
    NBO:{b:{SAL:{m:400000,y:4800000},PF:{m:48000,y:576000},RNT:{m:180000,y:2160000},ELC:{m:28000,y:336000},TEL:{m:35000,y:420000},ADV:{m:80000,y:960000},GDS:{m:50000,y:600000},SFT:{m:18000,y:216000},BNK:{m:24000,y:288000},PRF:{m:45000,y:540000},TRV:{m:28000,y:336000},TRN:{m:20000,y:240000},PRT:{m:5000,y:60000},INS:{m:10000,y:120000},DEP:{m:36000,y:432000},MSC:{m:20000,y:240000}}},
    DAR:{b:{SAL:{m:4000000,y:48000000},PF:{m:480000,y:5760000},RNT:{m:1800000,y:21600000},ELC:{m:280000,y:3360000},TEL:{m:340000,y:4080000},ADV:{m:800000,y:9600000},GDS:{m:500000,y:6000000},SFT:{m:180000,y:2160000},BNK:{m:240000,y:2880000},PRF:{m:400000,y:4800000},TRV:{m:280000,y:3360000},TRN:{m:200000,y:2400000},PRT:{m:50000,y:600000},INS:{m:100000,y:1200000},DEP:{m:350000,y:4200000},MSC:{m:180000,y:2160000}}},
    FBM:{b:{SAL:{m:4500,y:54000},PF:{m:540,y:6480},RNT:{m:2000,y:24000},ELC:{m:300,y:3600},TEL:{m:420,y:5040},ADV:{m:1200,y:14400},GDS:{m:550,y:6600},SFT:{m:320,y:3840},BNK:{m:300,y:3600},PRF:{m:500,y:6000},TRV:{m:380,y:4560},TRN:{m:200,y:2400},PRT:{m:60,y:720},INS:{m:150,y:1800},DEP:{m:620,y:7440},MSC:{m:400,y:4800}}},
  };
  ["2025-26","2026-27"].forEach(fy=>{
    const mult=fy==="2026-27"?1.1:1;
    Object.entries(seeds).forEach(([br,{b}])=>{
      const out={};
      EXP_LEDGERS.forEach(l=>{
        if(b[l.id])out[l.id]={monthly:Math.round(b[l.id].m*mult),yearly:Math.round(b[l.id].y*mult)};
      });
      _EXP_BUDGETS[`${br}_${fy}`]=out;
    });
  });
})();



export const EXP_ACTUALS=[
  /* BOM */
  {m:"2025-12",br:"BOM",id:"SAL",a:148000},{m:"2025-12",br:"BOM",id:"PF",a:17760},{m:"2025-12",br:"BOM",id:"RNT",a:82000},{m:"2025-12",br:"BOM",id:"ELC",a:8400},{m:"2025-12",br:"BOM",id:"TEL",a:12800},{m:"2025-12",br:"BOM",id:"ADV",a:22000},{m:"2025-12",br:"BOM",id:"GDS",a:18500},{m:"2025-12",br:"BOM",id:"SFT",a:9200},{m:"2025-12",br:"BOM",id:"BNK",a:6800},{m:"2025-12",br:"BOM",id:"PRF",a:15000},{m:"2025-12",br:"BOM",id:"TRV",a:8200},{m:"2025-12",br:"BOM",id:"TRN",a:0},{m:"2025-12",br:"BOM",id:"PRT",a:2400},{m:"2025-12",br:"BOM",id:"INS",a:5000},{m:"2025-12",br:"BOM",id:"DEP",a:14000},{m:"2025-12",br:"BOM",id:"MSC",a:4200},
  {m:"2026-01",br:"BOM",id:"SAL",a:152000},{m:"2026-01",br:"BOM",id:"PF",a:18240},{m:"2026-01",br:"BOM",id:"RNT",a:82000},{m:"2026-01",br:"BOM",id:"ELC",a:7900},{m:"2026-01",br:"BOM",id:"TEL",a:11600},{m:"2026-01",br:"BOM",id:"ADV",a:35000},{m:"2026-01",br:"BOM",id:"GDS",a:19200},{m:"2026-01",br:"BOM",id:"SFT",a:9200},{m:"2026-01",br:"BOM",id:"BNK",a:7400},{m:"2026-01",br:"BOM",id:"PRF",a:0},{m:"2026-01",br:"BOM",id:"TRV",a:9600},{m:"2026-01",br:"BOM",id:"TRN",a:18000},{m:"2026-01",br:"BOM",id:"PRT",a:1800},{m:"2026-01",br:"BOM",id:"INS",a:5000},{m:"2026-01",br:"BOM",id:"DEP",a:14000},{m:"2026-01",br:"BOM",id:"MSC",a:6100},
  {m:"2026-02",br:"BOM",id:"SAL",a:152000},{m:"2026-02",br:"BOM",id:"PF",a:18240},{m:"2026-02",br:"BOM",id:"RNT",a:82000},{m:"2026-02",br:"BOM",id:"ELC",a:8100},{m:"2026-02",br:"BOM",id:"TEL",a:13200},{m:"2026-02",br:"BOM",id:"ADV",a:28000},{m:"2026-02",br:"BOM",id:"GDS",a:17800},{m:"2026-02",br:"BOM",id:"SFT",a:9200},{m:"2026-02",br:"BOM",id:"BNK",a:5200},{m:"2026-02",br:"BOM",id:"PRF",a:25000},{m:"2026-02",br:"BOM",id:"TRV",a:7400},{m:"2026-02",br:"BOM",id:"TRN",a:0},{m:"2026-02",br:"BOM",id:"PRT",a:3200},{m:"2026-02",br:"BOM",id:"INS",a:5000},{m:"2026-02",br:"BOM",id:"DEP",a:14000},{m:"2026-02",br:"BOM",id:"MSC",a:3800},
  {m:"2026-03",br:"BOM",id:"SAL",a:155000},{m:"2026-03",br:"BOM",id:"PF",a:18600},{m:"2026-03",br:"BOM",id:"RNT",a:82000},{m:"2026-03",br:"BOM",id:"ELC",a:9200},{m:"2026-03",br:"BOM",id:"TEL",a:14000},{m:"2026-03",br:"BOM",id:"ADV",a:42000},{m:"2026-03",br:"BOM",id:"GDS",a:21000},{m:"2026-03",br:"BOM",id:"SFT",a:9200},{m:"2026-03",br:"BOM",id:"BNK",a:8100},{m:"2026-03",br:"BOM",id:"PRF",a:15000},{m:"2026-03",br:"BOM",id:"TRV",a:11200},{m:"2026-03",br:"BOM",id:"TRN",a:0},{m:"2026-03",br:"BOM",id:"PRT",a:2800},{m:"2026-03",br:"BOM",id:"INS",a:5000},{m:"2026-03",br:"BOM",id:"DEP",a:14000},{m:"2026-03",br:"BOM",id:"MSC",a:5600},
  {m:"2026-04",br:"BOM",id:"SAL",a:158000},{m:"2026-04",br:"BOM",id:"PF",a:18960},{m:"2026-04",br:"BOM",id:"RNT",a:85000},{m:"2026-04",br:"BOM",id:"ELC",a:10200},{m:"2026-04",br:"BOM",id:"TEL",a:13600},{m:"2026-04",br:"BOM",id:"ADV",a:31000},{m:"2026-04",br:"BOM",id:"GDS",a:22400},{m:"2026-04",br:"BOM",id:"SFT",a:9200},{m:"2026-04",br:"BOM",id:"BNK",a:7600},{m:"2026-04",br:"BOM",id:"PRF",a:20000},{m:"2026-04",br:"BOM",id:"TRV",a:9800},{m:"2026-04",br:"BOM",id:"TRN",a:25000},{m:"2026-04",br:"BOM",id:"PRT",a:1600},{m:"2026-04",br:"BOM",id:"INS",a:5000},{m:"2026-04",br:"BOM",id:"DEP",a:14500},{m:"2026-04",br:"BOM",id:"MSC",a:7200},
  {m:"2026-05",br:"BOM",id:"SAL",a:162000},{m:"2026-05",br:"BOM",id:"PF",a:19440},{m:"2026-05",br:"BOM",id:"RNT",a:85000},{m:"2026-05",br:"BOM",id:"ELC",a:11400},{m:"2026-05",br:"BOM",id:"TEL",a:15200},{m:"2026-05",br:"BOM",id:"ADV",a:48000},{m:"2026-05",br:"BOM",id:"GDS",a:23600},{m:"2026-05",br:"BOM",id:"SFT",a:9200},{m:"2026-05",br:"BOM",id:"BNK",a:8900},{m:"2026-05",br:"BOM",id:"PRF",a:30000},{m:"2026-05",br:"BOM",id:"TRV",a:12400},{m:"2026-05",br:"BOM",id:"TRN",a:0},{m:"2026-05",br:"BOM",id:"PRT",a:3600},{m:"2026-05",br:"BOM",id:"INS",a:5000},{m:"2026-05",br:"BOM",id:"DEP",a:14500},{m:"2026-05",br:"BOM",id:"MSC",a:8800},
  /* AMD */
  {m:"2025-12",br:"AMD",id:"SAL",a:60000},{m:"2025-12",br:"AMD",id:"RNT",a:28000},{m:"2025-12",br:"AMD",id:"TEL",a:4600},{m:"2025-12",br:"AMD",id:"GDS",a:8000},{m:"2025-12",br:"AMD",id:"ADV",a:11000},{m:"2025-12",br:"AMD",id:"SFT",a:4600},{m:"2025-12",br:"AMD",id:"BNK",a:2200},{m:"2025-12",br:"AMD",id:"DEP",a:5500},{m:"2025-12",br:"AMD",id:"PF",a:7200},{m:"2025-12",br:"AMD",id:"ELC",a:3200},{m:"2025-12",br:"AMD",id:"TRV",a:3800},{m:"2025-12",br:"AMD",id:"MSC",a:1800},
  {m:"2026-01",br:"AMD",id:"SAL",a:61000},{m:"2026-01",br:"AMD",id:"RNT",a:28000},{m:"2026-01",br:"AMD",id:"TEL",a:4800},{m:"2026-01",br:"AMD",id:"GDS",a:8200},{m:"2026-01",br:"AMD",id:"ADV",a:13000},{m:"2026-01",br:"AMD",id:"SFT",a:4600},{m:"2026-01",br:"AMD",id:"BNK",a:2400},{m:"2026-01",br:"AMD",id:"DEP",a:5500},{m:"2026-01",br:"AMD",id:"PF",a:7320},{m:"2026-01",br:"AMD",id:"ELC",a:3400},{m:"2026-01",br:"AMD",id:"TRV",a:4200},{m:"2026-01",br:"AMD",id:"MSC",a:2100},
  {m:"2026-02",br:"AMD",id:"SAL",a:61000},{m:"2026-02",br:"AMD",id:"RNT",a:28000},{m:"2026-02",br:"AMD",id:"TEL",a:5000},{m:"2026-02",br:"AMD",id:"GDS",a:7800},{m:"2026-02",br:"AMD",id:"ADV",a:11500},{m:"2026-02",br:"AMD",id:"SFT",a:4600},{m:"2026-02",br:"AMD",id:"BNK",a:2100},{m:"2026-02",br:"AMD",id:"DEP",a:5500},{m:"2026-02",br:"AMD",id:"PF",a:7320},{m:"2026-02",br:"AMD",id:"ELC",a:3100},{m:"2026-02",br:"AMD",id:"TRV",a:3600},{m:"2026-02",br:"AMD",id:"MSC",a:1600},
  {m:"2026-03",br:"AMD",id:"SAL",a:62000},{m:"2026-03",br:"AMD",id:"RNT",a:28000},{m:"2026-03",br:"AMD",id:"TEL",a:5200},{m:"2026-03",br:"AMD",id:"GDS",a:8400},{m:"2026-03",br:"AMD",id:"ADV",a:14000},{m:"2026-03",br:"AMD",id:"SFT",a:4600},{m:"2026-03",br:"AMD",id:"BNK",a:2600},{m:"2026-03",br:"AMD",id:"DEP",a:5500},{m:"2026-03",br:"AMD",id:"PF",a:7440},{m:"2026-03",br:"AMD",id:"ELC",a:3600},{m:"2026-03",br:"AMD",id:"TRV",a:4600},{m:"2026-03",br:"AMD",id:"MSC",a:2400},
  {m:"2026-04",br:"AMD",id:"SAL",a:62000},{m:"2026-04",br:"AMD",id:"RNT",a:28000},{m:"2026-04",br:"AMD",id:"TEL",a:4800},{m:"2026-04",br:"AMD",id:"GDS",a:8200},{m:"2026-04",br:"AMD",id:"ADV",a:12000},{m:"2026-04",br:"AMD",id:"SFT",a:4600},{m:"2026-04",br:"AMD",id:"BNK",a:2400},{m:"2026-04",br:"AMD",id:"DEP",a:5500},{m:"2026-04",br:"AMD",id:"PF",a:7440},{m:"2026-04",br:"AMD",id:"ELC",a:3200},{m:"2026-04",br:"AMD",id:"TRV",a:3900},{m:"2026-04",br:"AMD",id:"MSC",a:1900},
  {m:"2026-05",br:"AMD",id:"SAL",a:64000},{m:"2026-05",br:"AMD",id:"RNT",a:28000},{m:"2026-05",br:"AMD",id:"TEL",a:5200},{m:"2026-05",br:"AMD",id:"GDS",a:8800},{m:"2026-05",br:"AMD",id:"ADV",a:14000},{m:"2026-05",br:"AMD",id:"SFT",a:4600},{m:"2026-05",br:"AMD",id:"BNK",a:2800},{m:"2026-05",br:"AMD",id:"DEP",a:5500},{m:"2026-05",br:"AMD",id:"PF",a:7680},{m:"2026-05",br:"AMD",id:"ELC",a:3500},{m:"2026-05",br:"AMD",id:"TRV",a:4200},{m:"2026-05",br:"AMD",id:"MSC",a:2200},
  /* NBO — KES */
  {m:"2025-12",br:"NBO",id:"SAL",a:380000},{m:"2025-12",br:"NBO",id:"PF",a:45600},{m:"2025-12",br:"NBO",id:"RNT",a:180000},{m:"2025-12",br:"NBO",id:"ELC",a:28000},{m:"2025-12",br:"NBO",id:"TEL",a:32000},{m:"2025-12",br:"NBO",id:"ADV",a:60000},{m:"2025-12",br:"NBO",id:"GDS",a:48000},{m:"2025-12",br:"NBO",id:"SFT",a:18000},{m:"2025-12",br:"NBO",id:"BNK",a:22000},{m:"2025-12",br:"NBO",id:"PRF",a:40000},{m:"2025-12",br:"NBO",id:"TRV",a:24000},{m:"2025-12",br:"NBO",id:"DEP",a:35000},{m:"2025-12",br:"NBO",id:"MSC",a:18000},
  {m:"2026-01",br:"NBO",id:"SAL",a:390000},{m:"2026-01",br:"NBO",id:"PF",a:46800},{m:"2026-01",br:"NBO",id:"RNT",a:180000},{m:"2026-01",br:"NBO",id:"ELC",a:26000},{m:"2026-01",br:"NBO",id:"TEL",a:34000},{m:"2026-01",br:"NBO",id:"ADV",a:85000},{m:"2026-01",br:"NBO",id:"GDS",a:52000},{m:"2026-01",br:"NBO",id:"SFT",a:18000},{m:"2026-01",br:"NBO",id:"BNK",a:25000},{m:"2026-01",br:"NBO",id:"PRF",a:0},{m:"2026-01",br:"NBO",id:"TRV",a:28000},{m:"2026-01",br:"NBO",id:"DEP",a:35000},{m:"2026-01",br:"NBO",id:"MSC",a:22000},
  {m:"2026-02",br:"NBO",id:"SAL",a:390000},{m:"2026-02",br:"NBO",id:"PF",a:46800},{m:"2026-02",br:"NBO",id:"RNT",a:180000},{m:"2026-02",br:"NBO",id:"ELC",a:27000},{m:"2026-02",br:"NBO",id:"TEL",a:31000},{m:"2026-02",br:"NBO",id:"ADV",a:72000},{m:"2026-02",br:"NBO",id:"GDS",a:46000},{m:"2026-02",br:"NBO",id:"SFT",a:18000},{m:"2026-02",br:"NBO",id:"BNK",a:19000},{m:"2026-02",br:"NBO",id:"PRF",a:55000},{m:"2026-02",br:"NBO",id:"TRV",a:22000},{m:"2026-02",br:"NBO",id:"DEP",a:35000},{m:"2026-02",br:"NBO",id:"MSC",a:16000},
  {m:"2026-03",br:"NBO",id:"SAL",a:400000},{m:"2026-03",br:"NBO",id:"PF",a:48000},{m:"2026-03",br:"NBO",id:"RNT",a:180000},{m:"2026-03",br:"NBO",id:"ELC",a:29000},{m:"2026-03",br:"NBO",id:"TEL",a:36000},{m:"2026-03",br:"NBO",id:"ADV",a:95000},{m:"2026-03",br:"NBO",id:"GDS",a:54000},{m:"2026-03",br:"NBO",id:"SFT",a:18000},{m:"2026-03",br:"NBO",id:"BNK",a:28000},{m:"2026-03",br:"NBO",id:"PRF",a:40000},{m:"2026-03",br:"NBO",id:"TRV",a:32000},{m:"2026-03",br:"NBO",id:"DEP",a:35000},{m:"2026-03",br:"NBO",id:"MSC",a:24000},
  {m:"2026-04",br:"NBO",id:"SAL",a:405000},{m:"2026-04",br:"NBO",id:"PF",a:48600},{m:"2026-04",br:"NBO",id:"RNT",a:185000},{m:"2026-04",br:"NBO",id:"ELC",a:31000},{m:"2026-04",br:"NBO",id:"TEL",a:35000},{m:"2026-04",br:"NBO",id:"ADV",a:80000},{m:"2026-04",br:"NBO",id:"GDS",a:58000},{m:"2026-04",br:"NBO",id:"SFT",a:18000},{m:"2026-04",br:"NBO",id:"BNK",a:26000},{m:"2026-04",br:"NBO",id:"PRF",a:50000},{m:"2026-04",br:"NBO",id:"TRV",a:28000},{m:"2026-04",br:"NBO",id:"DEP",a:36000},{m:"2026-04",br:"NBO",id:"MSC",a:20000},
  {m:"2026-05",br:"NBO",id:"SAL",a:410000},{m:"2026-05",br:"NBO",id:"PF",a:49200},{m:"2026-05",br:"NBO",id:"RNT",a:185000},{m:"2026-05",br:"NBO",id:"ELC",a:33000},{m:"2026-05",br:"NBO",id:"TEL",a:38000},{m:"2026-05",br:"NBO",id:"ADV",a:110000},{m:"2026-05",br:"NBO",id:"GDS",a:62000},{m:"2026-05",br:"NBO",id:"SFT",a:18000},{m:"2026-05",br:"NBO",id:"BNK",a:30000},{m:"2026-05",br:"NBO",id:"PRF",a:65000},{m:"2026-05",br:"NBO",id:"TRV",a:34000},{m:"2026-05",br:"NBO",id:"DEP",a:36000},{m:"2026-05",br:"NBO",id:"MSC",a:28000},
  /* DAR — TZS */
  {m:"2025-12",br:"DAR",id:"SAL",a:3800000},{m:"2025-12",br:"DAR",id:"PF",a:456000},{m:"2025-12",br:"DAR",id:"RNT",a:1800000},{m:"2025-12",br:"DAR",id:"ELC",a:280000},{m:"2025-12",br:"DAR",id:"TEL",a:320000},{m:"2025-12",br:"DAR",id:"ADV",a:600000},{m:"2025-12",br:"DAR",id:"GDS",a:480000},{m:"2025-12",br:"DAR",id:"SFT",a:180000},{m:"2025-12",br:"DAR",id:"BNK",a:220000},{m:"2025-12",br:"DAR",id:"TRV",a:240000},{m:"2025-12",br:"DAR",id:"DEP",a:350000},{m:"2025-12",br:"DAR",id:"MSC",a:180000},
  {m:"2026-01",br:"DAR",id:"SAL",a:3900000},{m:"2026-01",br:"DAR",id:"PF",a:468000},{m:"2026-01",br:"DAR",id:"RNT",a:1800000},{m:"2026-01",br:"DAR",id:"ELC",a:260000},{m:"2026-01",br:"DAR",id:"TEL",a:340000},{m:"2026-01",br:"DAR",id:"ADV",a:850000},{m:"2026-01",br:"DAR",id:"GDS",a:520000},{m:"2026-01",br:"DAR",id:"SFT",a:180000},{m:"2026-01",br:"DAR",id:"BNK",a:250000},{m:"2026-01",br:"DAR",id:"TRV",a:280000},{m:"2026-01",br:"DAR",id:"DEP",a:350000},{m:"2026-01",br:"DAR",id:"MSC",a:220000},
  {m:"2026-02",br:"DAR",id:"SAL",a:3900000},{m:"2026-02",br:"DAR",id:"PF",a:468000},{m:"2026-02",br:"DAR",id:"RNT",a:1800000},{m:"2026-02",br:"DAR",id:"ELC",a:270000},{m:"2026-02",br:"DAR",id:"TEL",a:310000},{m:"2026-02",br:"DAR",id:"ADV",a:720000},{m:"2026-02",br:"DAR",id:"GDS",a:460000},{m:"2026-02",br:"DAR",id:"SFT",a:180000},{m:"2026-02",br:"DAR",id:"BNK",a:190000},{m:"2026-02",br:"DAR",id:"TRV",a:220000},{m:"2026-02",br:"DAR",id:"DEP",a:350000},{m:"2026-02",br:"DAR",id:"MSC",a:160000},
  {m:"2026-03",br:"DAR",id:"SAL",a:4000000},{m:"2026-03",br:"DAR",id:"PF",a:480000},{m:"2026-03",br:"DAR",id:"RNT",a:1800000},{m:"2026-03",br:"DAR",id:"ELC",a:290000},{m:"2026-03",br:"DAR",id:"TEL",a:360000},{m:"2026-03",br:"DAR",id:"ADV",a:950000},{m:"2026-03",br:"DAR",id:"GDS",a:540000},{m:"2026-03",br:"DAR",id:"SFT",a:180000},{m:"2026-03",br:"DAR",id:"BNK",a:280000},{m:"2026-03",br:"DAR",id:"TRV",a:320000},{m:"2026-03",br:"DAR",id:"DEP",a:350000},{m:"2026-03",br:"DAR",id:"MSC",a:240000},
  {m:"2026-04",br:"DAR",id:"SAL",a:4100000},{m:"2026-04",br:"DAR",id:"PF",a:492000},{m:"2026-04",br:"DAR",id:"RNT",a:1850000},{m:"2026-04",br:"DAR",id:"ELC",a:310000},{m:"2026-04",br:"DAR",id:"TEL",a:350000},{m:"2026-04",br:"DAR",id:"ADV",a:800000},{m:"2026-04",br:"DAR",id:"GDS",a:580000},{m:"2026-04",br:"DAR",id:"SFT",a:180000},{m:"2026-04",br:"DAR",id:"BNK",a:260000},{m:"2026-04",br:"DAR",id:"TRV",a:280000},{m:"2026-04",br:"DAR",id:"DEP",a:360000},{m:"2026-04",br:"DAR",id:"MSC",a:200000},
  {m:"2026-05",br:"DAR",id:"SAL",a:4200000},{m:"2026-05",br:"DAR",id:"PF",a:504000},{m:"2026-05",br:"DAR",id:"RNT",a:1850000},{m:"2026-05",br:"DAR",id:"ELC",a:330000},{m:"2026-05",br:"DAR",id:"TEL",a:380000},{m:"2026-05",br:"DAR",id:"ADV",a:1100000},{m:"2026-05",br:"DAR",id:"GDS",a:620000},{m:"2026-05",br:"DAR",id:"SFT",a:180000},{m:"2026-05",br:"DAR",id:"BNK",a:300000},{m:"2026-05",br:"DAR",id:"TRV",a:340000},{m:"2026-05",br:"DAR",id:"DEP",a:360000},{m:"2026-05",br:"DAR",id:"MSC",a:280000},
  /* FBM — USD */
  {m:"2025-12",br:"FBM",id:"SAL",a:4200},{m:"2025-12",br:"FBM",id:"RNT",a:2000},{m:"2025-12",br:"FBM",id:"TEL",a:380},{m:"2025-12",br:"FBM",id:"GDS",a:520},{m:"2025-12",br:"FBM",id:"ADV",a:800},{m:"2025-12",br:"FBM",id:"SFT",a:320},{m:"2025-12",br:"FBM",id:"BNK",a:280},{m:"2025-12",br:"FBM",id:"DEP",a:600},{m:"2025-12",br:"FBM",id:"MSC",a:420},
  {m:"2026-01",br:"FBM",id:"SAL",a:4300},{m:"2026-01",br:"FBM",id:"RNT",a:2000},{m:"2026-01",br:"FBM",id:"TEL",a:400},{m:"2026-01",br:"FBM",id:"GDS",a:540},{m:"2026-01",br:"FBM",id:"ADV",a:1200},{m:"2026-01",br:"FBM",id:"SFT",a:320},{m:"2026-01",br:"FBM",id:"BNK",a:310},{m:"2026-01",br:"FBM",id:"DEP",a:600},{m:"2026-01",br:"FBM",id:"MSC",a:480},
  {m:"2026-02",br:"FBM",id:"SAL",a:4300},{m:"2026-02",br:"FBM",id:"RNT",a:2000},{m:"2026-02",br:"FBM",id:"TEL",a:420},{m:"2026-02",br:"FBM",id:"GDS",a:510},{m:"2026-02",br:"FBM",id:"ADV",a:950},{m:"2026-02",br:"FBM",id:"SFT",a:320},{m:"2026-02",br:"FBM",id:"BNK",a:260},{m:"2026-02",br:"FBM",id:"DEP",a:600},{m:"2026-02",br:"FBM",id:"MSC",a:360},
  {m:"2026-03",br:"FBM",id:"SAL",a:4400},{m:"2026-03",br:"FBM",id:"RNT",a:2000},{m:"2026-03",br:"FBM",id:"TEL",a:440},{m:"2026-03",br:"FBM",id:"GDS",a:560},{m:"2026-03",br:"FBM",id:"ADV",a:1400},{m:"2026-03",br:"FBM",id:"SFT",a:320},{m:"2026-03",br:"FBM",id:"BNK",a:320},{m:"2026-03",br:"FBM",id:"DEP",a:600},{m:"2026-03",br:"FBM",id:"MSC",a:520},
  {m:"2026-04",br:"FBM",id:"SAL",a:4400},{m:"2026-04",br:"FBM",id:"RNT",a:2000},{m:"2026-04",br:"FBM",id:"TEL",a:410},{m:"2026-04",br:"FBM",id:"GDS",a:540},{m:"2026-04",br:"FBM",id:"ADV",a:1100},{m:"2026-04",br:"FBM",id:"SFT",a:320},{m:"2026-04",br:"FBM",id:"BNK",a:290},{m:"2026-04",br:"FBM",id:"DEP",a:620},{m:"2026-04",br:"FBM",id:"MSC",a:440},
  {m:"2026-05",br:"FBM",id:"SAL",a:4600},{m:"2026-05",br:"FBM",id:"RNT",a:2000},{m:"2026-05",br:"FBM",id:"TEL",a:460},{m:"2026-05",br:"FBM",id:"GDS",a:580},{m:"2026-05",br:"FBM",id:"ADV",a:1600},{m:"2026-05",br:"FBM",id:"SFT",a:320},{m:"2026-05",br:"FBM",id:"BNK",a:340},{m:"2026-05",br:"FBM",id:"DEP",a:620},{m:"2026-05",br:"FBM",id:"MSC",a:580},
];

/* ── Pre-seed budgets for all branches ── */
(()=>{
  const seeds={
    BOM:{fy:"2025-26",cur:"INR",b:{SAL:{m:150000,y:1800000},PF:{m:18000,y:216000},RNT:{m:82000,y:984000},ELC:{m:9000,y:108000},TEL:{m:12000,y:144000},ADV:{m:30000,y:360000},GDS:{m:20000,y:240000},SFT:{m:9200,y:110400},BNK:{m:6000,y:72000},PRF:{m:15000,y:180000},TRV:{m:10000,y:120000},TRN:{m:8000,y:96000},PRT:{m:2500,y:30000},INS:{m:5000,y:60000},DEP:{m:14000,y:168000},MSC:{m:5000,y:60000}}},
    AMD:{fy:"2025-26",cur:"INR",b:{SAL:{m:60000,y:720000},PF:{m:7200,y:86400},RNT:{m:28000,y:336000},ELC:{m:3500,y:42000},TEL:{m:5000,y:60000},ADV:{m:12000,y:144000},GDS:{m:8000,y:96000},SFT:{m:4600,y:55200},BNK:{m:2500,y:30000},PRF:{m:5000,y:60000},TRV:{m:4000,y:48000},TRN:{m:3000,y:36000},PRT:{m:1000,y:12000},INS:{m:2000,y:24000},DEP:{m:5500,y:66000},MSC:{m:2000,y:24000}}},
    NBO:{fy:"2025-26",cur:"KES",b:{SAL:{m:400000,y:4800000},PF:{m:48000,y:576000},RNT:{m:180000,y:2160000},ELC:{m:28000,y:336000},TEL:{m:35000,y:420000},ADV:{m:80000,y:960000},GDS:{m:50000,y:600000},SFT:{m:18000,y:216000},BNK:{m:24000,y:288000},PRF:{m:45000,y:540000},TRV:{m:28000,y:336000},TRN:{m:20000,y:240000},PRT:{m:5000,y:60000},INS:{m:10000,y:120000},DEP:{m:36000,y:432000},MSC:{m:20000,y:240000}}},
    DAR:{fy:"2025-26",cur:"TZS",b:{SAL:{m:4000000,y:48000000},PF:{m:480000,y:5760000},RNT:{m:1800000,y:21600000},ELC:{m:280000,y:3360000},TEL:{m:340000,y:4080000},ADV:{m:800000,y:9600000},GDS:{m:500000,y:6000000},SFT:{m:180000,y:2160000},BNK:{m:240000,y:2880000},PRF:{m:400000,y:4800000},TRV:{m:280000,y:3360000},TRN:{m:200000,y:2400000},PRT:{m:50000,y:600000},INS:{m:100000,y:1200000},DEP:{m:350000,y:4200000},MSC:{m:180000,y:2160000}}},
    FBM:{fy:"2025-26",cur:"USD",b:{SAL:{m:4500,y:54000},PF:{m:540,y:6480},RNT:{m:2000,y:24000},ELC:{m:300,y:3600},TEL:{m:420,y:5040},ADV:{m:1200,y:14400},GDS:{m:550,y:6600},SFT:{m:320,y:3840},BNK:{m:300,y:3600},PRF:{m:500,y:6000},TRV:{m:380,y:4560},TRN:{m:200,y:2400},PRT:{m:60,y:720},INS:{m:150,y:1800},DEP:{m:620,y:7440},MSC:{m:400,y:4800}}},
  };
  Object.entries(seeds).forEach(([br,s])=>{
    const out={};
    EXP_LEDGERS.forEach(l=>{if(s.b[l.id])out[l.id]={monthly:s.b[l.id].m,yearly:s.b[l.id].y};});
    _EXP_BUDGETS[`${br}_${s.fy}`]=out;
    /* FY 2026-27: 10% increase */
    const nxt={};
    Object.entries(out).forEach(([k,v])=>{nxt[k]={monthly:Math.round(v.monthly*1.1),yearly:Math.round(v.yearly*1.1)};});
    _EXP_BUDGETS[`${br}_2026-27`]=nxt;
  });
})();

/* ══════════════════════════════════════════════════════════════════
   EXPENSE BUDGET SCREEN
   ════════════════════════════════════════════════════════════════ */

export const HR_EMPLOYEES_DATA=[
  {id:"TK-TKHO-000",name:"Afshin Dhanani",    dept:"Management", desig:"Founder & Director",       branch:"TKHO",joined:"2008-04-01",dob:"1965-09-12",basic:500000,hra:200000,da:50000,travel:25000,medical:5000,pf:0,esi:0,tds:185000,bank:"HDFC Bank",ac:"XXXX0000",mobile:"+91 98201 00000",email:"afshin@travkings.com",status:"Active"},
  {id:"TK-TKHO-001",name:"Faiz Patel",         dept:"Finance",    desig:"Senior Finance Manager",   branch:"TKHO",joined:"2017-04-01",dob:"1980-08-12",basic:125000,hra:50000,da:12500,travel:8000,medical:1250,pf:15000,esi:0,tds:18500,bank:"HDFC Bank",ac:"XXXX0001",mobile:"+91 98201 00001",email:"faiz.fm@travkings.com",   status:"Active"},
  {id:"TK-TKHO-002",name:"Sughra Sayed",       dept:"Finance",    desig:"Sr. Accounts Executive",branch:"TKHO",joined:"2019-06-15",dob:"1985-02-28",basic:85000, hra:34000,da:8500, travel:5000,medical:1250,pf:10200,esi:0,tds:9800, bank:"ICICI Bank",ac:"XXXX0002",mobile:"+91 98201 00002",email:"sughra.sae@travkings.com",status:"Active"},
  {id:"TK-BOM-003",name:"Rohan",              dept:"Accounts",   desig:"Accounts Executive",     branch:"BOM",joined:"2022-01-10",dob:"1993-11-08",basic:28000,hra:11200,da:2800,travel:1500,medical:1250,pf:3360,esi:0,   tds:0,   bank:"HDFC Bank",ac:"XXXX9012",mobile:"+91 98201 33333",email:"rohan@travkings.com",status:"Active"},
  {id:"TK-AMD-002",name:"Mohan",               dept:"Accounts",   desig:"Accounts Executive",     branch:"AMD",joined:"2020-04-01",dob:"1988-07-14",basic:32000,hra:12800,da:3200,travel:1500,medical:1250,pf:3840,esi:0,   tds:500, bank:"HDFC Bank",ac:"XXXX6789",mobile:"+91 98254 22222",email:"mohan@travkings.com",status:"Active"},
  {id:"TK-NBO-003",name:"Mujeet",              dept:"Accounts",   desig:"Accounts Executive",     branch:"NBO",joined:"2022-03-15",dob:"1991-05-08",basic:32000,hra:12800,da:3200,travel:1800,medical:1250,pf:3840,esi:0,tds:0,bank:"KCB Bank",ac:"XXXX0103",mobile:"+254 700 100103",email:"mujeet@travkings.com",status:"Active"},
  {id:"TK-DAR-002",name:"Rujeet",              dept:"Accounts",   desig:"Accounts Executive",     branch:"DAR",joined:"2021-05-15",dob:"1992-03-18",basic:380000,hra:152000,da:38000,travel:30000,medical:15000,pf:45600,esi:0,tds:0,bank:"NMB Bank",   ac:"XXXX1098",mobile:"+255 76 400 5678",email:"ali@travkings.co.tz",status:"Active"},
  {id:"TK-FBM-002",name:"Sujeet",             dept:"Accounts",   desig:"Accounts Executive",     branch:"FBM",joined:"2022-08-01",dob:"1990-11-22",basic:30000,hra:12000,da:3000,travel:1500,medical:1250,pf:3600,esi:0,tds:0,bank:"Rawbank",ac:"XXXX0102",mobile:"+243 99 100 0102",email:"sujeet@travkings.com",status:"Active"},
];


export const HR_DEPTS=["All","Operations","Sales","Accounts","IT","HR & Admin"];

export const HR_BRANCHES_F=["All","BOM","AMD","NBO","DAR","FBM"];

/* ── Employee Master ──────────────────────────────────────────── */

export const BRANCH_FULL_DATA=[
  {
    code:"BOM", city:"Mumbai", country:"India", state:"Maharashtra", stateCode:"27",
    flag:"🇮🇳", timezone:"Asia/Kolkata", currency:"INR", cur_sym:"₹",
    tax:"GST", taxRate:"5–18%", fyStart:"April",gstFreq:"Monthly",
    entity:"Travkings Tours & Travels",
    pan:"AABCT1234H", gstin:"27AABCT1234H1Z5", tan:"MUMT12345A",
    iataNo:"14-3 12345 6", bspParticipant:"INB123456", bspSettleDay:"Monday",
    travelLicNo:"TL/MH/2019/001234", travelLicExpiry:"2027-03-31",
    iataAccredNo:"IATA-14312345", iataAccredExpiry:"2027-09-30",
    authSignatory:"Afshin Dhanani", authDesignation:"Founder & Director",
    operAddr:"401, Maker Chamber V, Nariman Point, Mumbai 400 021",
    regAddr:"401, Maker Chamber V, Nariman Point, Mumbai 400 021",
    pin:"400021", phone:"+91 22 4000 1234", whatsapp:"+91 98200 11111",
    email:"mumbai@travkings.com", website:"www.travkings.com",
    costCentre:"CC-BOM", intercoMarkup:3, active:true,
    banks:[
      {bankName:"HDFC Bank", branch:"Nariman Point", acNo:"50100123456789", ifsc:"HDFC0001234", swift:"", type:"Current", primary:true},
      {bankName:"ICICI Bank", branch:"Fort",         acNo:"123456789012",   ifsc:"ICIC0001234", swift:"", type:"Current", primary:false},
    ],
    voucherPrefixes:{SF:"SF",SH:"SH",SHT:"SHT",SC:"SC",SV:"SV",SI:"SI",SM:"SM",SPI:"SPI",SCN:"SCN",SDN:"SDN",PF:"PF",PH:"PH",PHT:"PHT",PV:"PV",PC:"PC",PI:"PI",PM:"PM",RV:"RV",PMT:"PMT",CV:"CV",JV:"JV"},
    staff:5,
  },
  {
    code:"AMD", city:"Ahmedabad", country:"India", state:"Gujarat", stateCode:"24",
    flag:"🇮🇳", timezone:"Asia/Kolkata", currency:"INR", cur_sym:"₹",
    tax:"GST", taxRate:"5–18%", fyStart:"April", gstFreq:"Monthly",
    entity:"Travkings Tours & Travels",
    pan:"AABCT1234H", gstin:"24AABCT1234H1Z2", tan:"AHMT12345B",
    iataNo:"14-3 23456 7", bspParticipant:"INB234567", bspSettleDay:"Monday",
    travelLicNo:"TL/GJ/2020/005678", travelLicExpiry:"2027-06-30",
    iataAccredNo:"IATA-14323456", iataAccredExpiry:"2027-09-30",
    authSignatory:"Afshin Dhanani", authDesignation:"Founder & Director",
    operAddr:"202, Shapath IV, SG Highway, Ahmedabad 380 054",
    regAddr:"401, Maker Chamber V, Nariman Point, Mumbai 400 021",
    pin:"380054", phone:"+91 79 4000 5678", whatsapp:"+91 98200 33333",
    email:"ahmedabad@travkings.com", website:"www.travkings.com",
    costCentre:"CC-AMD", intercoMarkup:3, active:true,
    banks:[
      {bankName:"ICICI Bank", branch:"CG Road", acNo:"987654321098", ifsc:"ICIC0005678", swift:"", type:"Current", primary:true},
    ],
    voucherPrefixes:{SF:"SF",SH:"SH",SHT:"SHT",SC:"SC",SV:"SV",SI:"SI",SM:"SM",SPI:"SPI",SCN:"SCN",SDN:"SDN",PF:"PF",PH:"PH",PHT:"PHT",PV:"PV",PC:"PC",PI:"PI",PM:"PM",RV:"RV",PMT:"PMT",CV:"CV",JV:"JV"},
    staff:2,
  },
  {
    code:"NBO", city:"Nairobi", country:"Kenya", state:"Nairobi County", stateCode:"",
    flag:"🇰🇪", timezone:"Africa/Nairobi", currency:"KES", cur_sym:"KES",
    tax:"VAT", taxRate:"16%", fyStart:"January", gstFreq:"Monthly",
    entity:"Travkings Tours & Travels Ltd.",
    pan:"", gstin:"P051234567X", tan:"",
    iataNo:"15-4 34567 8", bspParticipant:"KEB345678", bspSettleDay:"Tuesday",
    travelLicNo:"KATO/2019/1234", travelLicExpiry:"2026-12-31",
    iataAccredNo:"IATA-15434567", iataAccredExpiry:"2026-12-31",
    authSignatory:"Mujeet", authDesignation:"Director",
    operAddr:"ICEA Building, Kenyatta Avenue, Nairobi",
    regAddr:"ICEA Building, Kenyatta Avenue, Nairobi",
    pin:"00100", phone:"+254 20 400 1234", whatsapp:"+254 722 111111",
    email:"nairobi@travkings.co.ke", website:"www.travkings.co.ke",
    costCentre:"CC-NBO", intercoMarkup:4, active:true,
    banks:[
      {bankName:"KCB Bank", branch:"Kenyatta Ave", acNo:"1234567890", ifsc:"", swift:"KCBLKENX", type:"Current", primary:true},
      {bankName:"Equity Bank", branch:"Upper Hill", acNo:"0987654321", ifsc:"", swift:"EQBLKENA", type:"Current", primary:false},
    ],
    voucherPrefixes:{SF:"SF",SH:"SH",SHT:"SHT",SC:"SC",SV:"SV",SI:"SI",SM:"SM",SPI:"SPI",SCN:"SCN",SDN:"SDN",PF:"PF",PH:"PH",PHT:"PHT",PV:"PV",PC:"PC",PI:"PI",PM:"PM",RV:"RV",PMT:"PMT",CV:"CV",JV:"JV"},
    staff:2,
  },
  {
    code:"DAR", city:"Dar es Salaam", country:"Tanzania", state:"Dar es Salaam Region", stateCode:"",
    flag:"🇹🇿", timezone:"Africa/Dar_es_Salaam", currency:"TZS", cur_sym:"TZS",
    tax:"VAT", taxRate:"18%", fyStart:"January", gstFreq:"Monthly",
    entity:"Travkings Tours & Travels Ltd.",
    pan:"", gstin:"123-456-789", tan:"",
    iataNo:"15-4 45678 9", bspParticipant:"TZB456789", bspSettleDay:"Tuesday",
    travelLicNo:"TATO/2020/5678", travelLicExpiry:"2027-03-31",
    iataAccredNo:"IATA-15445678", iataAccredExpiry:"2027-03-31",
    authSignatory:"Rujeet", authDesignation:"Director",
    operAddr:"Plot 45, Ohio Street, Dar es Salaam",
    regAddr:"Plot 45, Ohio Street, Dar es Salaam",
    pin:"", phone:"+255 22 400 5678", whatsapp:"+255 755 111111",
    email:"dar@travkings.co.tz", website:"www.travkings.co.tz",
    costCentre:"CC-DAR", intercoMarkup:4, active:true,
    banks:[
      {bankName:"CRDB Bank", branch:"Ohio Street", acNo:"01J1012345678901", ifsc:"", swift:"CRDBTZTX", type:"Current", primary:true},
    ],
    voucherPrefixes:{SF:"SF",SH:"SH",SHT:"SHT",SC:"SC",SV:"SV",SI:"SI",SM:"SM",SPI:"SPI",SCN:"SCN",SDN:"SDN",PF:"PF",PH:"PH",PHT:"PHT",PV:"PV",PC:"PC",PI:"PI",PM:"PM",RV:"RV",PMT:"PMT",CV:"CV",JV:"JV"},
    staff:2,
  },
  {
    code:"FBM", city:"Lubumbashi", country:"DRC", state:"Haut-Katanga", stateCode:"",
    flag:"🇨🇩", timezone:"Africa/Lubumbashi", currency:"USD", cur_sym:"$",
    tax:"VAT", taxRate:"16%", fyStart:"January", gstFreq:"Monthly",
    entity:"Travkings Tours & Travels SPRL",
    pan:"", gstin:"CD-FBM-456789", tan:"",
    iataNo:"16-5 56789 0", bspParticipant:"CDB567890", bspSettleDay:"Wednesday",
    travelLicNo:"MIN-TOU/2021/9012", travelLicExpiry:"2026-06-30",
    iataAccredNo:"IATA-16556789", iataAccredExpiry:"2026-06-30",
    authSignatory:"Claude Mbuyi", authDesignation:"Managing Director",
    operAddr:"Avenue Lumumba 12, Lubumbashi, Haut-Katanga",
    regAddr:"Avenue Lumumba 12, Lubumbashi, Haut-Katanga",
    pin:"", phone:"+243 99 400 1234", whatsapp:"+243 99 400 1234",
    email:"lubumbashi@travkings.cd", website:"www.travkings.cd",
    costCentre:"CC-FBM", intercoMarkup:5, active:true,
    banks:[
      {bankName:"Rawbank", branch:"Lubumbashi Centre", acNo:"00001-23456-78901", ifsc:"", swift:"RAWBCDKI", type:"Current", primary:true},
    ],
    voucherPrefixes:{SF:"SF",SH:"SH",SHT:"SHT",SC:"SC",SV:"SV",SI:"SI",SM:"SM",SPI:"SPI",SCN:"SCN",SDN:"SDN",PF:"PF",PH:"PH",PHT:"PHT",PV:"PV",PC:"PC",PI:"PI",PM:"PM",RV:"RV",PMT:"PMT",CV:"CV",JV:"JV"},
    staff:1,
  },
];


export const ACTION_LABELS={view:"View",create:"Create",edit:"Edit",delete:"Delete",approve:"Approve",print:"Print",export:"Export"};

export const ACTION_CLR={view:"#185FA5",create:"#27500A",edit:"#854F0B",delete:"#A32D2D",approve:"#1D9E75",print:"#384677",export:"#5a6691"};

export const _USERS_DATA=[
  {id:16,name:"Afshin Dhanani", email:"afshin@travkings.com",    role:"Director",                 branches:["TKHO","BOM","AMD","NBO","DAR","FBM"],last:"2026-05-19 14:20",active:true, phone:"+91 98201 00000"},
  {id:1,name:"AD",             email:"ad@travkings.com",      role:"Super Admin",        branches:["TKHO","BOM","AMD","NBO","DAR","FBM"],last:"2026-05-17 09:14",active:true, phone:"+91 98200 11111"},  {id:6,name:"Rohan",          email:"rohan@travkings.com",    role:"Accounts Executive", branches:["BOM"],                         last:"2026-05-17 10:05",active:true, phone:"+91 98200 44444"},
  {id:7,name:"Mohan",          email:"mohan@travkings.com",  role:"Accounts Executive", branches:["AMD"],                         last:"2026-05-16 15:30",active:true, phone:"+91 98200 55555"},  {id:11,name:"Faiz Patel",    email:"faiz.fm@travkings.com",  role:"Senior Finance Manager",   branches:["TKHO","BOM","AMD","NBO","DAR","FBM"],last:"2026-05-19 11:30",active:true, phone:"+91 98201 00001"},
  {id:12,name:"Sughra Sayed",  email:"sughra.sae@travkings.com",role:"Sr. Accounts Executive",branches:["TKHO","BOM","AMD","NBO","DAR","FBM"],last:"2026-05-19 10:45",active:true, phone:"+91 98201 00002"},
  {id:13,name:"Mujeet",        email:"mujeet@travkings.com",   role:"Accounts Executive",       branches:["NBO"],                         last:"2026-05-19 09:15",active:true, phone:"+254 700 100103"},
  {id:14,name:"Rujeet",        email:"rujeet@travkings.com",   role:"Accounts Executive",       branches:["DAR"],                         last:"2026-05-18 16:20",active:true, phone:"+255 755 100104"},
  {id:15,name:"Sujeet",        email:"sujeet@travkings.com",   role:"Accounts Executive",       branches:["FBM"],                         last:"2026-05-19 08:40",active:true, phone:"+243 99 100 0102"},
];

/* ════════════════════════════════════════════════════════════════
   SETTINGS → USERS & ROLES  /settings/users
   ════════════════════════════════════════════════════════════════ */



export const FOREX_RATES_DATA=[
  {date:"2026-05-17",from:"USD",to:"INR",rate:83.42,source:"RBI"},
  {date:"2026-05-17",from:"AED",to:"INR",rate:22.71,source:"RBI"},
  {date:"2026-05-17",from:"GBP",to:"INR",rate:105.60,source:"RBI"},
  {date:"2026-05-17",from:"EUR",to:"INR",rate:90.15,source:"RBI"},
  {date:"2026-05-17",from:"SGD",to:"INR",rate:61.80,source:"RBI"},
  {date:"2026-05-17",from:"USD",to:"KES",rate:129.50,source:"CBK"},
  {date:"2026-05-17",from:"USD",to:"TZS",rate:2680.00,source:"BOT"},
  {date:"2026-05-16",from:"USD",to:"INR",rate:83.38,source:"RBI"},
  {date:"2026-05-16",from:"AED",to:"INR",rate:22.70,source:"RBI"},
  {date:"2026-05-16",from:"GBP",to:"INR",rate:105.45,source:"RBI"},
];

/* ── Proforma / Quote store ─── */

export const NOTIFICATIONS_DATA=[
  {id:1,type:"warning",title:"GSTR-1 Filing Due",body:"BOM + AMD GSTR-1 for May 2026 due by 11 June 2026.",route:"/tax/gstr1",read:false,ts:"2026-05-18 09:00"},
  {id:2,type:"danger", title:"Overdue Receivable — Globex Consulting",body:"Rs.34,000 outstanding > 60 days. Last invoice: Apr 2026.",route:"/reports/rec",read:false,ts:"2026-05-17 14:30"},
  {id:3,type:"warning",title:"BSP Payment Due Monday",body:"BSP debit of Rs.2,14,000 scheduled for 20 May 2026.",route:"/purchase/bsp-recon",read:false,ts:"2026-05-17 10:00"},
  {id:4,type:"info",   title:"3 Unmatched Purchase Vouchers",body:"BOM: PF00045, PH00018; AMD: PV00006 — link to sales.",route:"/tickets/unmatched",read:false,ts:"2026-05-17 08:00"},
  {id:5,type:"info",   title:"Rohan — Passport Expiry",body:"Passport Z1234567 expires in 5 months (Oct 2026).",route:"/masters/customers",read:true, ts:"2026-05-16 16:00"},
  {id:6,type:"success",title:"Payroll Processed — May 2026",body:"BOM payroll of Rs.3,92,700 processed by Rohan.",route:"/hr/payroll",read:true, ts:"2026-05-15 17:45"},
  {id:7,type:"warning",title:"Expense Budget — Marketing Over",body:"BOM May ADV: Rs.48,000 vs budget Rs.30,000 (160%).",route:"/reports/exp-bgt",read:false,ts:"2026-05-15 09:30"},
  {id:8,type:"info",   title:"GSTR-3B Due — 20 June",body:"BOM+AMD GSTR-3B for May 2026. Compute ITC before filing.",route:"/tax/gstr3b",read:true, ts:"2026-05-14 11:00"},
];

/* ── Notification store ─── */

export const ADM_REASON_CODES={
  FD:{code:"FD",label:"Fare Difference",      desc:"Wrong fare class / fare basis applied"},
  CR:{code:"CR",label:"Commission Recall",     desc:"Airline reclaiming commission paid in excess"},
  TE:{code:"TE",label:"Tax / Fee Error",       desc:"Incorrect tax or airport fee applied"},
  WC:{code:"WC",label:"Waiver Charge",         desc:"Unauthorized waiver applied on ticket"},
  RE:{code:"RE",label:"Refund Error",          desc:"Excess refund processed or wrong refund amount"},
  IR:{code:"IR",label:"Incorrect Routing",     desc:"Routing rules violated / itinerary error"},
  IT:{code:"IT",label:"Invalid Ticket",        desc:"Ticket issued on invalid / expired fare"},
  AD:{code:"AD",label:"Administrative",        desc:"Airline administrative charge"},
  MS:{code:"MS",label:"Miscellaneous",         desc:"Other reason — see remarks"},
};

/* ── ACM Reason Codes ── */

export const ADM_DATA=[
  {id:"ADM-AI-2026-0412",date:"2026-04-12",airline:"Air India",airlineCode:"AI",iataNum:"098",
   ticketNo:"098-2156789010",passenger:"Rajiv Sharma",sector:"BOM-DXB",issueDate:"2026-03-05",
   reasonCode:"FD",amount:3820,currency:"INR",branch:"BOM",consultant:"Rahul M",
   bspDebitDate:"2026-05-12",responseDeadline:"2026-05-12",
   status:"Settled",disputeNote:"",remarks:"Economy fare issued instead of Flexi — difference recovered"},
  {id:"ADM-EK-2026-0428",date:"2026-04-28",airline:"Emirates",airlineCode:"EK",iataNum:"176",
   ticketNo:"176-8901234567",passenger:"Priya Mehta",sector:"BOM-DXB-LHR",issueDate:"2026-04-01",
   reasonCode:"CR",amount:8400,currency:"INR",branch:"BOM",consultant:"Priya S",
   bspDebitDate:"2026-05-28",responseDeadline:"2026-05-28",
   status:"Disputed",disputeNote:"Commission was per our PLACI agreement — disputing with documentary evidence",remarks:"Override commission should not be recalled — PLACI Level 4"},
  {id:"ADM-6E-2026-0505",date:"2026-05-05",airline:"IndiGo",airlineCode:"6E",iataNum:"526",
   ticketNo:"526-3456789012",passenger:"Rohan",sector:"BOM-DEL",issueDate:"2026-04-22",
   reasonCode:"TE",amount:1180,currency:"INR",branch:"BOM",consultant:"Rahul M",
   bspDebitDate:"2026-06-05",responseDeadline:"2026-06-04",
   status:"Under Review",disputeNote:"",remarks:"GST charged at 18% instead of 5% — verifying with IndiGo"},
  {id:"ADM-AI-2026-0508",date:"2026-05-08",airline:"Air India",airlineCode:"AI",iataNum:"098",
   ticketNo:"098-2156789022",passenger:"Nexus Industries Emp",sector:"AMD-DEL",issueDate:"2026-04-28",
   reasonCode:"WC",amount:2500,currency:"INR",branch:"AMD",consultant:"Neha P",
   bspDebitDate:"2026-06-08",responseDeadline:"2026-06-07",
   status:"Received",disputeNote:"",remarks:"Date change fee waived without airline approval"},
  {id:"ADM-KQ-2026-0410",date:"2026-04-10",airline:"Kenya Airways",airlineCode:"KQ",iataNum:"706",
   ticketNo:"706-9012345678",passenger:"James Kamau",sector:"NBO-DXB",issueDate:"2026-03-15",
   reasonCode:"RE",amount:45000,currency:"KES",branch:"NBO",consultant:"Kevin O",
   bspDebitDate:"2026-05-10",responseDeadline:"2026-05-10",
   status:"Settled",disputeNote:"",remarks:"Partial refund processed — airline recovered excess"},
  {id:"ADM-ET-2026-0515",date:"2026-05-15",airline:"Ethiopian Airlines",airlineCode:"ET",iataNum:"071",
   ticketNo:"071-5678901234",passenger:"Ali Hassan",sector:"DAR-ADD-DXB",issueDate:"2026-05-05",
   reasonCode:"IR",amount:380000,currency:"TZS",branch:"DAR",consultant:"Amina H",
   bspDebitDate:"2026-06-15",responseDeadline:"2026-06-14",
   status:"Under Review",disputeNote:"",remarks:"Routing via ADD claimed invalid — checking fare rules"},
];

/* ── ACM Sample Data ── */

export const LEDGER_REGISTRY=[
  /* Bank & Cash */
  {id:"hdfc_bom",name:"HDFC Bank CA — Nariman Point",group:"Current Assets",nature:"Dr",type:"Bank",branch:"BOM",currency:"INR"},
  {id:"icici_bom",name:"ICICI Bank CA — Fort",        group:"Current Assets",nature:"Dr",type:"Bank",branch:"BOM",currency:"INR"},
  {id:"icici_amd",name:"ICICI Bank CA — CG Road",     group:"Current Assets",nature:"Dr",type:"Bank",branch:"AMD",currency:"INR"},
  {id:"kcb_nbo",  name:"KCB Bank CA — Kenyatta Ave",  group:"Current Assets",nature:"Dr",type:"Bank",branch:"NBO",currency:"KES"},
  {id:"equity_nbo",name:"Equity Bank CA — Upper Hill", group:"Current Assets",nature:"Dr",type:"Bank",branch:"NBO",currency:"KES"},
  {id:"crdb_dar",  name:"CRDB Bank — Ohio Street",    group:"Current Assets",nature:"Dr",type:"Bank",branch:"DAR",currency:"TZS"},
  {id:"rawbank_fbm",name:"Rawbank — Lubumbashi",      group:"Current Assets",nature:"Dr",type:"Bank",branch:"FBM",currency:"USD"},
  {id:"cash_bom",  name:"Cash in Hand — BOM",         group:"Current Assets",nature:"Dr",type:"Cash",branch:"BOM",currency:"INR"},
  {id:"cash_amd",  name:"Cash in Hand — AMD",         group:"Current Assets",nature:"Dr",type:"Cash",branch:"AMD",currency:"INR"},
  {id:"petty_bom", name:"Petty Cash — BOM",           group:"Current Assets",nature:"Dr",type:"Cash",branch:"BOM",currency:"INR"},
  /* Debtors */
  {id:"sharma",   name:"Sharma Enterprises",          group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"mehta",    name:"Mehta & Sons",                group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"techcorp", name:"TechCorp MICE",               group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"kavita",   name:"Rohan",                 group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"patel_exp",name:"Patel Exports",               group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"globex",   name:"Globex Consulting",           group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"nexus",    name:"Nexus Industries",            group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"apex",     name:"Apex Pharma",                 group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"INR"},
  {id:"grace",    name:"Mujeet",               group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"KES"},
  {id:"james_k",  name:"James Kamau",                 group:"Sundry Debtors",nature:"Cr",type:"Debtor",branch:"ALL",currency:"KES"},
  /* Creditors */
  {id:"bsp_india",name:"BSP India Payable",           group:"Current Liabilities",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
  {id:"air_india",name:"Air India Ltd.",              group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
  {id:"emirates", name:"Emirates GSA India",          group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
  {id:"indigo",   name:"IndiGo Airlines",             group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
  {id:"bali_dmc", name:"Bali Tours DMC",              group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"USD"},
  {id:"island_esc",name:"Island Escapes",             group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"USD"},
  {id:"vfs",      name:"VFS Global India",            group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
  {id:"tata_aig", name:"TATA AIG Insurance",          group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
  {id:"kq_direct",name:"KQ Direct NBO",              group:"Sundry Creditors",nature:"Cr",type:"Creditor",branch:"NBO",currency:"KES"},
  /* Sales & Income */
  {id:"s_flight", name:"Flight Ticket Sales",         group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_holiday",name:"Holiday Package Sales",       group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_hotel",  name:"Hotel Sales",                 group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_visa",   name:"Visa Service Fee Income",     group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_comm",   name:"Commission Income — Airlines",group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_placi",  name:"PLACI/Override Commission",  group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_svc",    name:"Service Charge Income",       group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"s_cancel", name:"Cancellation Charge Income",  group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  {id:"forex_gain",name:"Forex Gain on Settlement",   group:"Sales Accounts",nature:"Cr",type:"Income",branch:"ALL",currency:"INR"},
  /* Purchase & Expenses */
  {id:"p_flight", name:"Flight Ticket Purchase — BSP",group:"Purchase Accounts",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"p_holiday",name:"Holiday Package Purchase",    group:"Purchase Accounts",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"p_hotel",  name:"Hotel Accommodation Cost",    group:"Purchase Accounts",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"p_visa",   name:"Visa Fee — Embassy",          group:"Purchase Accounts",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"p_vfs",    name:"VFS/BLS Processing Charges",  group:"Purchase Accounts",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"p_bsp_svc",name:"BSP Service Charge (0.25%)",  group:"Direct Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"p_gds",    name:"GDS Charges",                 group:"Direct Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"forex_loss",name:"Forex Loss on Settlement",   group:"Direct Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  /* Indirect Expenses */
  {id:"e_salary", name:"Salaries & Wages",            group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_pf",     name:"Employer PF Contribution",    group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_esi",    name:"Employer ESI Contribution",   group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_rent",   name:"Office Rent",                 group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_tel",    name:"Telephone & Internet",        group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_soft",   name:"Software Subscriptions",      group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_adv",    name:"Advertising & Marketing",     group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_bank",   name:"Bank Charges & Commission",   group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_travel", name:"Travel & Conveyance",         group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_depn",   name:"Depreciation Expense",        group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  {id:"e_bad",    name:"Bad Debts Written Off",       group:"Indirect Expenses",nature:"Dr",type:"Expense",branch:"ALL",currency:"INR"},
  /* Tax & Compliance */
  {id:"cgst_out", name:"Output CGST",                 group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"sgst_out", name:"Output SGST",                 group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"igst_out", name:"Output IGST",                 group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"cgst_in",  name:"Input CGST",                  group:"Current Assets",nature:"Dr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"sgst_in",  name:"Input SGST",                  group:"Current Assets",nature:"Dr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"igst_in",  name:"Input IGST",                  group:"Current Assets",nature:"Dr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tds_pay_c",name:"TDS Payable — 194C",          group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tds_pay_h",name:"TDS Payable — 194H",          group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tds_pay_j",name:"TDS Payable — 194J",          group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tds_pay_d",name:"TDS Payable — 194D",          group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tds_rec",  name:"TDS Receivable",              group:"Current Assets",nature:"Dr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tcs_pay",  name:"TCS Payable — 206C(1G)",      group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"tcs_rec",  name:"TCS Receivable",              group:"Current Assets",nature:"Dr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"pf_pay",   name:"PF Payable — Employee+Employer",group:"Current Liabilities",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"esi_pay",  name:"ESI Payable",                 group:"Current Liabilities",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"pt_pay",   name:"Professional Tax Payable",    group:"Current Liabilities",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"salary_pay",name:"Salary Payable",             group:"Current Liabilities",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"adm_prov", name:"ADM Provision Account",       group:"Current Liabilities",nature:"Cr",type:"Tax",branch:"ALL",currency:"INR"},
  {id:"vat_ke",   name:"VAT Payable — Kenya (16%)",   group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"NBO",currency:"KES"},
  {id:"vat_tz",   name:"VAT Payable — Tanzania (18%)",group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"DAR",currency:"TZS"},
  {id:"wht_ke",   name:"WHT Payable — Kenya",         group:"Duties & Taxes",nature:"Cr",type:"Tax",branch:"NBO",currency:"KES"},
  /* Capital */
  {id:"capital",  name:"Proprietor's Capital",        group:"Capital Account",nature:"Cr",type:"Capital",branch:"ALL",currency:"INR"},
  {id:"retained", name:"Retained Earnings",           group:"Capital Account",nature:"Cr",type:"Capital",branch:"ALL",currency:"INR"},
  {id:"advance_cli",name:"Advance from Clients",      group:"Current Liabilities",nature:"Cr",type:"Liability",branch:"ALL",currency:"INR"},
];

/* ── TDS SECTION REFERENCE ──────────────────────────────────── */

export const ROUTE_TITLES={
  "/dashboard":            "Dashboard",
  "/sales/flight":         "Sales — Flight Tickets",
  "/sales/holiday":        "Sales — Holiday Packages",
  "/sales/hotel":          "Sales — Hotels",
  "/sales/car":            "Sales — Car Rentals",
  "/sales/visa":           "Sales — Visas",
  "/sales/insurance":      "Sales — Insurance",
  "/sales/misc":           "Sales — Miscellaneous",
  "/sales/credit-note":    "Sales — Credit Notes",
  "/purchase/flight":      "Purchase — Flight Tickets",
  "/purchase/holiday":     "Purchase — Holiday Packages",
  "/purchase/hotel":       "Purchase — Hotels",
  "/purchase/visa":        "Purchase — Visas",
  "/purchase/car":         "Purchase — Car Rentals",
  "/purchase/insurance":   "Purchase — Insurance",
  "/purchase/misc":        "Purchase — Miscellaneous",
  "/receipts":             "Receipt Voucher",
  "/payments":             "Payment Voucher",
  "/contra":               "Contra Voucher",
  "/bank-reco":            "Bank Reconciliation",
  "/journal":              "Journal Entry",
  "/day-book":             "Day Book",
  "/ledger":               "Ledger Account",
  "/trial-balance":        "Trial Balance",
  "/tax/gstr1":            "GSTR-1 — Outward Supplies",
  "/tax/gstr3b":           "GSTR-3B — Monthly Return",
  "/tax/tds":              "TDS / TCS Register",
  "/tax/rcm":              "RCM Register",
  "/tax/vat":              "VAT Return",
  "/tax/einvoice":         "E-Invoice & IRN",
  "/reports/pnl":          "Profit & Loss Report",
  "/reports/bs":           "Balance Sheet",
  "/reports/cf":           "Cash Flow Statement",
  "/reports/rec":          "Receivables Ageing",
  "/reports/pay":          "Payables Ageing",
  "/reports/sreg":         "Sales Register",
  "/reports/branch":       "Branch Comparison",
  "/reports/pkg":          "Package P&L",
  "/reports/gp":           "Gross Profit Reports",
  "/tickets/unmatched":    "Unmatched Vouchers",
  "/sales/debit-note":      "Debit Notes — Additional Charges",
  "/sales/cancellation":    "Cancellation Register",
  "/purchase/refunds":      "Refund Tracking",
  "/purchase/adm":          "ADM Register — Agent Debit Memos",
  "/purchase/acm":          "ACM Register — Agent Credit Memos",
  "/purchase/bsp-summary":  "BSP Settlement Summary",
  "/masters/sub-agents":    "Sub-Agent Master",
  "/masters/forex":         "Forex Exchange Rates",
  "/reports/commission":    "Commission Income Register",
  "/search":                "Global Search",
  "/bookings":              "Booking Files — Trip Dockets",
  "/group-dashboard":       "Group Executive Dashboard — Travkings Group",
  "/tax/calendar":          "Tax Compliance Calendar",
  "/hr/leave":              "Leave Management",
  "/hr/expenses":           "Employee Expense Claims",
  "/settings/preferences":  "Display Preferences",
  "/reports/mis":            "MIS Report — Management Information System",
  "/reports/concentration":  "Client Concentration Risk",
  "/reports/consolidated-bs":"Consolidated Balance Sheet — Travkings Group",
  "/reports/cashflow-forecast":"Cash Flow Forecast — 90 Days",
  "/reports/supplier-360":   "Supplier 360° View",
  "/reports/tally-export":   "Tally XML Export",
  "/bookings/advances":      "Advance & Deposit Ledger",
  "/masters/passports":      "Passport & Document Manager",
  "/masters/markup":         "Markup / Net Rate Sheet",
  "/masters/vendor-terms":   "Vendor Payment Terms",
  "/purchase/ticket-control":"Air Ticket Control Register",
  "/purchase/bsp-import":    "BSP CSV Import & Reconciliation",
  "/purchase/gds-import":    "GDS PNR Import",
  "/tax/gstr2b":             "GSTR-2B Reconciliation",
  "/tax/tds-certs":          "TDS Certificate Register — Form 16A",
  "/hr/salary-revision":     "Salary Revision Tracker",
  "/expense/budget":        "Expense Budget — Monthly & Yearly Ledger-wise",
  "/reports/exp-bgt":       "Expense Budget vs Actual Report",
  "/hr/employees":         "Employee Master",
  "/hr/attendance":        "Attendance Register",
  "/hr/payroll":           "Salary Run — Payroll Processing",
  "/hr/payslips":          "Payslips",
  "/settings/company":     "Company Profile & Legal Details",
  "/settings/branches":    "Branch Configuration",
  "/settings/users":       "Users & Roles",
  "/settings/audit":       "Audit Log",
  "/masters/groups":       "Chart of Accounts",
  "/masters/ledgers":      "Masters — Ledgers",
  "/masters/customers":    "Masters — Customers",
  "/masters/suppliers":    "Masters — Suppliers",
  "/masters/airlines":     "Masters — Airlines & Consolidators",
  "/masters/hotels":       "Masters — Hotels & DMCs",
  "/masters/tax":          "Masters — Tax Rates",
};



export const LOAN_REGISTER = [
  {id:"LN-001",type:"Vehicle Loan",lender:"HDFC Bank",principal:1500000,emi:32500,rate:9.5,tenure:60,startDate:"2024-04-01",balance:1185000,paid:14,remaining:46,branch:"BOM",purpose:"Office vehicle — Maruti Dzire",nextDue:"2026-06-01"},
  {id:"LN-002",type:"Equipment Loan",lender:"ICICI Bank",principal:850000,emi:18750,rate:10.25,tenure:60,startDate:"2024-09-15",balance:712000,paid:8,remaining:52,branch:"BOM",purpose:"Office equipment & furniture",nextDue:"2026-06-15"},
  {id:"LN-003",type:"Term Loan",lender:"Equity Bank Kenya",principal:5500000,emi:135000,rate:13.0,tenure:48,startDate:"2024-01-10",balance:4250000,paid:16,remaining:32,branch:"NBO",purpose:"Branch expansion & inventory",nextDue:"2026-06-10"},
  {id:"LN-004",type:"Working Capital",lender:"Standard Chartered",principal:25000000,emi:0,rate:11.5,tenure:0,startDate:"2024-05-01",balance:18500000,paid:0,remaining:0,branch:"DAR",purpose:"Cash credit limit — utilised",nextDue:"2026-06-30"},
];


export const EMP_LOANS_DATA = [
  {id:"EL-001",empCode:"EMP-0024",name:"Rohan",designation:"Senior Consultant",branch:"BOM",type:"Personal Loan",principal:200000,disbursedDate:"2025-09-15",emi:18500,emiCount:12,paid:8,outstanding:74000,rate:8.0,reason:"Medical emergency — family"},
  {id:"EL-002",empCode:"EMP-0015",name:"Rohan",designation:"Senior Travel Consultant",branch:"BOM",type:"Salary Advance",principal:50000,disbursedDate:"2026-03-22",emi:12500,emiCount:4,paid:2,outstanding:25000,rate:0,reason:"Festival advance"},
  {id:"EL-003",empCode:"EMP-0042",name:"Vikram Singh",designation:"Sr. Travel Consultant",branch:"AMD",type:"Education Loan",principal:150000,disbursedDate:"2025-06-10",emi:7500,emiCount:24,paid:11,outstanding:97500,rate:5.0,reason:"Children's higher education"},
  {id:"EL-004",empCode:"EMP-0058",name:"Mujeet",designation:"Operations Lead",branch:"NBO",type:"Salary Advance",principal:75000,disbursedDate:"2026-04-05",emi:18750,emiCount:4,paid:1,outstanding:56250,rate:0,reason:"Personal — house deposit"},
  {id:"EL-005",empCode:"EMP-0073",name:"James Kamau",designation:"Visa Officer",branch:"NBO",type:"Personal Loan",principal:120000,disbursedDate:"2024-12-01",emi:11000,emiCount:12,paid:6,outstanding:66000,rate:7.5,reason:"Vehicle down-payment"},
  {id:"EL-006",empCode:"EMP-0091",name:"Suchart B.",designation:"Sales Manager",branch:"DAR",type:"Education Loan",principal:2500000,disbursedDate:"2025-04-20",emi:115000,emiCount:24,paid:13,outstanding:1265000,rate:6.0,reason:"MBA — son"},
];


export const NUMBERING_SERIES_DATA = [
  /* TKHO */
  {id:"NS-001",branch:"TKHO",voucherType:"Receipt",      prefix:"RV", nextNo:1247, format:"TKHO/RV/{YY}/{####}",active:true},
  {id:"NS-002",branch:"TKHO",voucherType:"Payment",      prefix:"PV", nextNo:892,  format:"TKHO/PV/{YY}/{####}",active:true},
  {id:"NS-003",branch:"TKHO",voucherType:"Journal",      prefix:"JV", nextNo:156,  format:"TKHO/JV/{YY}/{####}",active:true},
  {id:"NS-004",branch:"TKHO",voucherType:"Contra",       prefix:"CV", nextNo:78,   format:"TKHO/CV/{YY}/{####}",active:true},
  /* BOM */
  {id:"NS-010",branch:"BOM",voucherType:"Receipt",       prefix:"RV", nextNo:4521, format:"BOM/RV/{YY}/{####}",active:true},
  {id:"NS-011",branch:"BOM",voucherType:"Payment",       prefix:"PV", nextNo:3214, format:"BOM/PV/{YY}/{####}",active:true},
  {id:"NS-012",branch:"BOM",voucherType:"Journal",       prefix:"JV", nextNo:198,  format:"BOM/JV/{YY}/{####}",active:true},
  {id:"NS-013",branch:"BOM",voucherType:"Tax Invoice",   prefix:"INV",nextNo:8742, format:"BOM/INV/{YY}/{####}",active:true},
  {id:"NS-014",branch:"BOM",voucherType:"Credit Note",   prefix:"CN", nextNo:88,   format:"BOM/CN/{YY}/{####}",active:true},
  /* AMD */
  {id:"NS-020",branch:"AMD",voucherType:"Receipt",       prefix:"RV", nextNo:1542, format:"AMD/RV/{YY}/{####}",active:true},
  {id:"NS-021",branch:"AMD",voucherType:"Payment",       prefix:"PV", nextNo:1018, format:"AMD/PV/{YY}/{####}",active:true},
  {id:"NS-022",branch:"AMD",voucherType:"Tax Invoice",   prefix:"INV",nextNo:3245, format:"AMD/INV/{YY}/{####}",active:true},
  /* NBO */
  {id:"NS-030",branch:"NBO",voucherType:"Receipt",       prefix:"RV", nextNo:982,  format:"NBO/RV/{YY}/{####}",active:true},
  {id:"NS-031",branch:"NBO",voucherType:"Payment",       prefix:"PV", nextNo:651,  format:"NBO/PV/{YY}/{####}",active:true},
  {id:"NS-032",branch:"NBO",voucherType:"Tax Invoice",   prefix:"INV",nextNo:2104, format:"NBO/INV/{YY}/{####}",active:true},
  /* DAR */
  {id:"NS-040",branch:"DAR",voucherType:"Receipt",       prefix:"RV", nextNo:712,  format:"DAR/RV/{YY}/{####}",active:true},
  {id:"NS-041",branch:"DAR",voucherType:"Payment",       prefix:"PV", nextNo:524,  format:"DAR/PV/{YY}/{####}",active:true},
  {id:"NS-042",branch:"DAR",voucherType:"Tax Invoice",   prefix:"INV",nextNo:1845, format:"DAR/INV/{YY}/{####}",active:true},
  /* FBM */
  {id:"NS-050",branch:"FBM",voucherType:"Receipt",       prefix:"RV", nextNo:486,  format:"FBM/RV/{YY}/{####}",active:true},
  {id:"NS-051",branch:"FBM",voucherType:"Payment",       prefix:"PV", nextNo:328,  format:"FBM/PV/{YY}/{####}",active:true},
  {id:"NS-052",branch:"FBM",voucherType:"Tax Invoice",   prefix:"INV",nextNo:1248, format:"FBM/INV/{YY}/{####}",active:true},
];

/* ─── Shared style helpers (reused inside masters) ───────────────── */


export const FY_TARGETS_DATA = [
  {metric:"Revenue",     target:280000000, actual:248500000, unit:"₹"},
  {metric:"Gross Profit",target:42000000,  actual:38200000,  unit:"₹"},
  {metric:"Net Profit",  target:18500000,  actual:16800000,  unit:"₹"},
  {metric:"Bookings",    target:1850,      actual:1642,      unit:""},
];


export const KEY_ALERTS_DATA = [
  {type:"audit",     severity:"high", date:"2026-05-19", title:"NBO bank reco — 12 unmatched items > 30 days",                                    route:"/bank-reco"},
  {type:"statutory", severity:"high", date:"2026-05-20", title:"GSTR-3B for AMD due in 2 days (₹2.85L payable)",                                  route:"/tax/gstr-3b"},
  {type:"variance",  severity:"med",  date:"2026-05-18", title:"Operations cost variance > 12% in BOM May (₹1.2L over budget)",                   route:"/reports/variance"},
  {type:"statutory", severity:"med",  date:"2026-05-22", title:"TDS deposit due (₹4.85L across all branches)",                                    route:"/tax/tds"},
  {type:"audit",     severity:"low",  date:"2026-05-17", title:"3 vendor masters missing PAN — required for TDS",                                 route:"/masters/suppliers"},
];


export const CASH_FORECAST_13W = (()=>{
  let open=8450000;
  return Array.from({length:13},(_,i)=>{
    const wk=`Wk ${i+1}`;
    const inflow=4500000+Math.random()*2500000;
    const outflow=3800000+Math.random()*2200000;
    const close=open+inflow-outflow;
    const row={week:wk,opening:Math.round(open),inflow:Math.round(inflow),outflow:Math.round(outflow),closing:Math.round(close)};
    open=close;
    return row;
  });
})();


export const HR_STATS_DATA = {
  totalHeadcount:8, changeThisMonth:2, attendancePct:96.5,
  pendingLeave:3, payrollStatus:"Posted — April",
  openPositions:1,
  birthdays:[
    {name:"Sughra Sayed",    date:"2026-05-22", branch:"TKHO"},
    {name:"Mujeet",          date:"2026-05-25", branch:"NBO"},
  ],
  anniversaries:[
    {name:"Faiz Patel",      date:"2026-06-01", years:9, branch:"TKHO"},
    {name:"Rohan",           date:"2026-06-15", years:4, branch:"BOM"},
    {name:"Afshin Dhanani",  date:"2026-06-20", years:18,branch:"TKHO"},
  ],
};


export const INTERBRANCH_ELIMINATIONS = [
  {voucher:"JV-TKHO/2026/001",date:"2026-04-01",from:"TKHO",to:"BOM",ledger:"Loan to BOM",amount:5000000,nature:"Working capital loan"},
  {voucher:"JV-TKHO/2026/004",date:"2026-04-15",from:"TKHO",to:"AMD",ledger:"Advance for office",amount:1200000,nature:"Capex advance"},
  {voucher:"SI-AMD/2026/118",date:"2026-04-22",from:"AMD",to:"BOM",ledger:"Service charges",amount:240000,nature:"Cross-branch consultancy"},
  {voucher:"JV-TKHO/2026/008",date:"2026-04-28",from:"TKHO",to:"NBO",ledger:"Forex advance",amount:850000,nature:"FX hedge collateral"},
  {voucher:"SI-NBO/2026/044",date:"2026-05-02",from:"NBO",to:"DAR",ledger:"Safari coordination",amount:185000,nature:"Africa region services"},
  {voucher:"PV-BOM/2026/342",date:"2026-05-10",from:"BOM",to:"TKHO",ledger:"Management fee",amount:325000,nature:"HO management fee allocation"},
  {voucher:"JV-TKHO/2026/015",date:"2026-05-15",from:"TKHO",to:"FBM",ledger:"Working capital",amount:425000,nature:"Operational support"},
];


export const YIELD_BY_DESTINATION = [
  {destination:"Dubai, UAE",         country:"UAE",      bookings:142,revenue:24500000,cost:19800000,gp:4700000, gpPct:19.2},
  {destination:"Singapore",          country:"Singapore",bookings:48, revenue:14200000,cost:11400000,gp:2800000, gpPct:19.7},
  {destination:"Bali, Indonesia",    country:"Indonesia",bookings:88, revenue:18500000,cost:14200000,gp:4300000, gpPct:23.2},
  {destination:"Maldives",           country:"Maldives", bookings:32, revenue:9800000, cost:6900000, gp:2900000, gpPct:29.6},
  {destination:"London, UK",         country:"UK",       bookings:24, revenue:11200000,cost:9100000, gp:2100000, gpPct:18.8},
  {destination:"Bangkok, Thailand",  country:"Thailand", bookings:115,revenue:12800000,cost:10500000,gp:2300000, gpPct:18.0},
  {destination:"Mauritius",          country:"Mauritius",bookings:18, revenue:6500000, cost:4800000, gp:1700000, gpPct:26.2},
  {destination:"Kuala Lumpur",       country:"Malaysia", bookings:42, revenue:7200000, cost:5900000, gp:1300000, gpPct:18.1},
  {destination:"Nairobi (incoming)", country:"Kenya",    bookings:38, revenue:8200000, cost:5800000, gp:2400000, gpPct:29.3},
  {destination:"Cairo, Egypt",       country:"Egypt",    bookings:14, revenue:5400000, cost:4100000, gp:1300000, gpPct:24.1},
];


export const YIELD_BY_CONSULTANT = [
  {consultant:"Rohan",  branch:"BOM",bookings:182,revenue:38500000,gp:6850000,gpPct:17.8,avgBookingValue:211538},
  {consultant:"Mohan",  branch:"AMD",bookings:84, revenue:14200000,gp:2480000,gpPct:17.5,avgBookingValue:169048},
  {consultant:"Mujeet", branch:"NBO",bookings:62, revenue:18500000,gp:4200000,gpPct:22.7,avgBookingValue:298387},
  {consultant:"Rujeet", branch:"DAR",bookings:38, revenue:9800000, gp:2680000,gpPct:27.3,avgBookingValue:257895},
  {consultant:"Sujeet", branch:"FBM",bookings:28, revenue:6400000, gp:1850000,gpPct:28.9,avgBookingValue:228571},
];


export const YIELD_BY_SUPPLIER = [
  {supplier:"Air India Ltd. (BSP)",  category:"Airline",  expectedCost:42000000,actualCost:42500000,variance:500000, variancePct:1.2, reliability:"Good"},
  {supplier:"Emirates Airlines (BSP)",category:"Airline", expectedCost:28000000,actualCost:28200000,variance:200000, variancePct:0.7, reliability:"Excellent"},
  {supplier:"Indigo Airlines",       category:"Airline",  expectedCost:18000000,actualCost:18500000,variance:500000, variancePct:2.8, reliability:"Good"},
  {supplier:"Dubai Wonders DMC",     category:"DMC",      expectedCost:11500000,actualCost:12400000,variance:900000, variancePct:7.8, reliability:"Avg"},
  {supplier:"Kenya Safari Lodge Ltd.",category:"Hotel",   expectedCost:9500000, actualCost:9800000, variance:300000, variancePct:3.2, reliability:"Good"},
  {supplier:"Serengeti Camps Ltd.",  category:"Hotel",    expectedCost:7000000, actualCost:7400000, variance:400000, variancePct:5.7, reliability:"Avg"},
  {supplier:"Marriott Group (Bali)", category:"Hotel",    expectedCost:7000000, actualCost:6800000, variance:-200000,variancePct:-2.9,reliability:"Excellent"},
  {supplier:"VFS Global (Visa)",     category:"Visa",     expectedCost:5000000, actualCost:5200000, variance:200000, variancePct:4.0, reliability:"Good"},
  {supplier:"Hertz Car Rental",      category:"Transfer", expectedCost:4200000, actualCost:4500000, variance:300000, variancePct:7.1, reliability:"Avg"},
  {supplier:"Bajaj Allianz Insurance",category:"Insurance",expectedCost:3800000, actualCost:3800000, variance:0,      variancePct:0.0, reliability:"Excellent"},
];


export const YOY_PL = [
  {line:"Revenue from Operations",       cy:248500000, ly:210400000, group:"Revenue"},
  {line:"Other Income",                   cy:8500000,   ly:5200000,   group:"Revenue"},
  {line:"Total Revenue",                  cy:257000000, ly:215600000, group:"Revenue", bold:true},
  {line:"Cost of Tours/Tickets",          cy:198500000, ly:172500000, group:"Costs"},
  {line:"Employee Benefit Expenses",      cy:9540000,   ly:8200000,   group:"Costs"},
  {line:"Finance Costs",                  cy:1850000,   ly:1620000,   group:"Costs"},
  {line:"Depreciation & Amortisation",    cy:2400000,   ly:2150000,   group:"Costs"},
  {line:"Other Expenses",                 cy:24300000,  ly:20800000,  group:"Costs"},
  {line:"Total Expenses",                 cy:236590000, ly:205270000, group:"Costs", bold:true},
  {line:"Profit Before Tax",              cy:20410000,  ly:10330000,  group:"Profit", bold:true},
  {line:"Tax Expense",                    cy:3610000,   ly:1850000,   group:"Profit"},
  {line:"Net Profit",                     cy:16800000,  ly:8480000,   group:"Profit", bold:true},
];


export const LEAVE_UTILIZATION = [
  {empId:"TK-TKHO-000",name:"Afshin Dhanani",branch:"TKHO",entitled:30,used:6, balance:24,casual:2,sick:1,earned:3,utilPct:20.0},
  {empId:"TK-TKHO-001",name:"Faiz Patel",    branch:"TKHO",entitled:24,used:8, balance:16,casual:4,sick:2,earned:2,utilPct:33.3},
  {empId:"TK-TKHO-002",name:"Sughra Sayed",  branch:"TKHO",entitled:24,used:12,balance:12,casual:5,sick:3,earned:4,utilPct:50.0},
  {empId:"TK-BOM-003", name:"Rohan",         branch:"BOM", entitled:21,used:14,balance:7, casual:6,sick:4,earned:4,utilPct:66.7},
  {empId:"TK-AMD-002", name:"Mohan",         branch:"AMD", entitled:21,used:5, balance:16,casual:3,sick:1,earned:1,utilPct:23.8},
  {empId:"TK-NBO-003", name:"Mujeet",        branch:"NBO", entitled:21,used:18,balance:3, casual:7,sick:6,earned:5,utilPct:85.7},
  {empId:"TK-DAR-002", name:"Rujeet",        branch:"DAR", entitled:21,used:9, balance:12,casual:4,sick:3,earned:2,utilPct:42.9},
  {empId:"TK-FBM-002", name:"Sujeet",        branch:"FBM", entitled:21,used:3, balance:18,casual:1,sick:1,earned:1,utilPct:14.3},
];


export const TAX_FILING_BOARD = [
  {entity:"Travkings — TKHO", taxes:{
    "GSTR-1":  {status:"Filed",  date:"2026-05-11"},
    "GSTR-3B": {status:"Filed",  date:"2026-05-20"},
    "TDS":     {status:"Filed",  date:"2026-05-07"},
    "PF":      {status:"Pending",date:"—"},
    "Advance Tax":{status:"Filed",date:"2026-03-15"},
  }},
  {entity:"Travkings — BOM", taxes:{
    "GSTR-1":  {status:"Filed",  date:"2026-05-11"},
    "GSTR-3B": {status:"Pending",date:"—"},
    "TDS":     {status:"Filed",  date:"2026-05-07"},
    "PF":      {status:"Pending",date:"—"},
    "Advance Tax":{status:"Filed",date:"2026-03-15"},
  }},
  {entity:"Travkings — AMD", taxes:{
    "GSTR-1":  {status:"Pending",date:"—"},
    "GSTR-3B": {status:"Pending",date:"—"},
    "TDS":     {status:"Filed",  date:"2026-05-07"},
    "PF":      {status:"Pending",date:"—"},
    "Advance Tax":{status:"Filed",date:"2026-03-15"},
  }},
  {entity:"Travkings — NBO", taxes:{
    "VAT":     {status:"Filed",  date:"2026-05-15"},
    "WHT":     {status:"Filed",  date:"2026-05-09"},
    "PAYE":    {status:"Pending",date:"—"},
  }},
  {entity:"Travkings — DAR", taxes:{
    "VAT":     {status:"Pending",date:"—"},
    "WHT":     {status:"Filed",  date:"2026-05-09"},
    "PAYE":    {status:"Pending",date:"—"},
  }},
  {entity:"Travkings — FBM", taxes:{
    "VAT":     {status:"Filed",  date:"2026-05-15"},
    "WHT":     {status:"Filed",  date:"2026-05-09"},
  }},
];


export const TAX_CALENDAR_EVENTS = [
  {date:"2026-05-20",type:"GST",  title:"GSTR-3B — April 2026",      entity:"All India entities",amount:285000,status:"Due Today",color:"#A32D2D"},
  {date:"2026-05-31",type:"PF",   title:"PF Challan — April 2026",   entity:"All entities",      amount:42500, status:"Upcoming",color:"#f97316"},
  {date:"2026-05-31",type:"ESI",  title:"ESI Challan — April 2026",  entity:"All entities",      amount:18200, status:"Upcoming",color:"#f97316"},
  {date:"2026-06-07",type:"TDS",  title:"TDS Deposit — May 2026",    entity:"All entities",      amount:485000,status:"Upcoming",color:"#d4a437"},
  {date:"2026-06-15",type:"IT",   title:"Advance Tax Q1 (15%)",      entity:"Travkings P Ltd",   amount:1850000,status:"Upcoming",color:"#d4a437"},
  {date:"2026-06-20",type:"GST",  title:"GSTR-3B — May 2026",        entity:"All India entities",amount:0,     status:"Upcoming",color:"#d4a437"},
  {date:"2026-06-25",type:"GST",  title:"GSTR-1 — May 2026",         entity:"All India entities",amount:0,     status:"Upcoming",color:"#d4a437"},
  {date:"2026-07-07",type:"TDS",  title:"TDS Deposit — June 2026",   entity:"All entities",      amount:0,     status:"Upcoming",color:"#5a6691"},
  {date:"2026-07-15",type:"TDS",  title:"TDS Q1 Return (26Q+24Q)",   entity:"All India entities",amount:0,     status:"Upcoming",color:"#5a6691"},
  {date:"2026-07-20",type:"VAT",  title:"VAT Return — May 2026 (NBO)",entity:"Travkings NBO",    amount:148000,status:"Upcoming",color:"#5a6691"},
  {date:"2026-07-31",type:"VAT",  title:"VAT Return — May 2026 (DAR)",entity:"Travkings DAR",    amount:185000,status:"Upcoming",color:"#5a6691"},
  {date:"2026-09-15",type:"IT",   title:"Advance Tax Q2 (45%)",      entity:"Travkings P Ltd",   amount:5550000,status:"Upcoming",color:"#5a6691"},
];

/* ════════════════════════════════════════════════════════════════════
   10. GSTR-1 AUTO-PREP
   ════════════════════════════════════════════════════════════════════ */

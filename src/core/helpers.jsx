/* ════════════════════════════════════════════════════════════════════
   CORE/HELPERS.JS
   Auto-generated from KBiz360_v2.jsx · 2516 lines · 161 declarations
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Lock, Plus, Printer, Save, Search, Settings, User } from 'lucide-react';
import { Cell } from 'recharts';
import { exportToCSV } from './business-logic';
import { ADM_DATA, CASH, FY_TARGETS_DATA, GP_BILLS, HR_EMPLOYEES_DATA, LEDGER_REGISTRY, NOTIFICATIONS_DATA, _EXP_BGT_LISTENERS, _EXP_BUDGETS } from './data';
import { fmt, fmtINR } from './format';
import { useMobile } from './hooks';
import { B, FL, KpiCard, RPT_tdStyle, RPT_thStyle, bc, btnG, btnGh, card, inp, vDate } from './styles';
import { AcctsExecDashboard, Dashboard, DirectorDashboard, HrMgrDashboard, SrAeDashboard, SrFmDashboard } from '../modules/dashboard';
import { VendorTermsMaster } from '../modules/masters';
import { IntercompanyBilling } from '../modules/reports';
import { EWayBill } from '../modules/taxation';
import { ContraVoucher, PaymentVoucher, ReceiptVoucher } from '../modules/transactions';

export const VTH=({c,r})=><th style={{textAlign:r?"right":"left",padding:"6px 8px",fontWeight:500,color:"#5a6691",fontSize:10.5,whiteSpace:"nowrap",background:"#f3f4f8"}}>{c}</th>;

export const VTD=({c,r})=><td style={{padding:"4px 7px",textAlign:r?"right":"left",fontSize:11,fontVariantNumeric:r?"tabular-nums":"normal"}}>{c}</td>;

export const BANK_LIST_V=[
  "HDFC Bank CA — Nariman Point","HDFC Bank CA — Ahmedabad","ICICI Bank CA — Fort",
  "KCB Bank — Nairobi","CRDB Bank — Dar es Salaam","Rawbank USD — Lubumbashi",
  "Cash in Hand","Petty Cash",
];


export const PMT_MODES_V=[
  "NEFT","RTGS","IMPS","UPI","Cheque","DD","Cash","SWIFT","Card",
];


/* ReceiptVoucher — see rebuilt version below */
/* PaymentVoucher — see rebuilt version below */
/* ContraVoucher — see rebuilt version below */
/* ════ FIX 5: BANK RECONCILIATION — PDC Register + Cheque Bounce ═ */

export function getDbRows(branch){
  const p=branch==="ALL"?"BOM":branch?.code||"BOM";
  const fy=vDate();
  return [
    {time:"09:15",vno:`${p}/${fy}/SF00043`,type:"Sales",   party:"Apex Pharma",        dr:0,    cr:52170, narr:"Air ticket — DEL"},
    {time:"10:30",vno:`${p}/${fy}/RV00032`,type:"Receipt", party:"Sharma Enterprises", dr:52170,cr:0,     narr:"NEFT receipt"},
    {time:"11:00",vno:`${p}/${fy}/SC00012`,type:"Sales",   party:"Nexus Industries",   dr:0,    cr:14490, narr:"Car hire"},
    {time:"12:45",vno:`${p}/${fy}/SV00009`,type:"Sales",   party:"Rohan",        dr:0,    cr:21950, narr:"UAE visa"},
    {time:"14:00",vno:`${p}/${fy}/PF00043`,type:"Purchase",party:"IndiGo Airlines",    dr:31200,cr:0,     narr:"Ticket cost"},
    {time:"15:30",vno:`${p}/${fy}/JV00022`,type:"Journal", party:"GST/VAT transfer",   dr:14850,cr:14850, narr:"Tax adj."},
    {time:"16:00",vno:`${p}/${fy}/PMT0028`,type:"Payment", party:"Airline",            dr:37000,cr:0,     narr:"BSP payment"},
  ];
}

export const DB_CLR={Sales:{bg:"#E6F1FB",c:"#185FA5"},Receipt:{bg:"#EAF3DE",c:"#27500A"},Purchase:{bg:"#FAEEDA",c:"#854F0B"},Payment:{bg:"#FCEBEB",c:"#A32D2D"},Journal:{bg:"#f3f4f8",c:"#5a6691"},Contra:{bg:"#F3E8FF",c:"#5B21B6"}};

export function getLtx(branch){
  const p=branch==="ALL"?"BOM":branch?.code||"BOM";
  const fy=vDate();
  return [
    {date:"2026-04-01",vno:"OB",                 type:"Opening",narr:"Opening balance",       dr:0,     cr:0,      bal:215000, bt:"Dr"},
    {date:"2026-04-15",vno:`${p}/${fy}/SF00031`, type:"Sales",  narr:"Flight ticket",          dr:0,     cr:48500,  bal:263500, bt:"Dr"},
    {date:"2026-04-22",vno:`${p}/${fy}/RV00021`, type:"Receipt",narr:"NEFT receipt",           dr:263500,cr:0,      bal:0,      bt:"Nil"},
    {date:"2026-05-05",vno:`${p}/${fy}/SF00042`, type:"Sales",  narr:"Flight ticket",          dr:0,     cr:52170,  bal:52170,  bt:"Dr"},
    {date:"2026-05-10",vno:`${p}/${fy}/SH00018`, type:"Sales",  narr:"Holiday package",        dr:0,     cr:272800, bal:324970, bt:"Dr"},
    {date:"2026-05-15",vno:`${p}/${fy}/RV00031`, type:"Receipt",narr:"Part payment NEFT",      dr:52170, cr:0,      bal:272800, bt:"Dr"},
  ];
}

export const B2B_D=[
  {gstin:"27AAPFL9876K1Z3",name:"Apex Pharma Ltd.",inv:3,taxable:148500,cgst:13365,sgst:13365,igst:0},
  {gstin:"27AABCS1234L1Z5",name:"Sharma Enterprises",inv:5,taxable:212000,cgst:19080,sgst:19080,igst:0},
  {gstin:"29AATCS6789M1Z4",name:"TechCorp Solutions",inv:2,taxable:85000,cgst:0,sgst:0,igst:15300},
  {gstin:"24AABCM8765G1Z2",name:"Mehta & Sons",inv:4,taxable:272800,cgst:6820,sgst:6820,igst:0},
];

export const PNL_D=[
  {head:"INCOME",items:[
    {l:"Flight Sales — Domestic",v:28500000,sub:true},{l:"Flight Sales — International",v:13700000,sub:true},
    {l:"Holiday Package Sales",v:18400000,sub:true},{l:"Hotel Sales",v:6200000,sub:true},
    {l:"Car Rental Sales",v:2800000,sub:true},{l:"Visa Service Income",v:1850000,sub:true},
    {l:"Insurance Commission",v:950000,sub:true},{l:"Service Charge / Markup",v:4800000,sub:true},
    {l:"Total Revenue",v:77200000,bold:true,sep:true},
  ]},
  {head:"DIRECT COSTS",items:[
    {l:"Flight Ticket Purchase",v:24800000,sub:true},{l:"Tour Package Purchase",v:14200000,sub:true},
    {l:"Hotel Purchase",v:4900000,sub:true},{l:"Car Hire Cost",v:2100000,sub:true},{l:"Visa Fee Expense",v:1200000,sub:true},
    {l:"Total Direct Cost",v:47200000,bold:true,sep:true},
    {l:"GROSS PROFIT",v:30000000,bold:true,hl:"#EAF3DE",hc:"#27500A"},
  ]},
  {head:"INDIRECT EXPENSES",items:[
    {l:"Salaries & Wages",v:10200000,sub:true},{l:"Office Rent",v:2160000,sub:true},
    {l:"GDS Charges",v:864000,sub:true},{l:"Marketing & Advertising",v:1440000,sub:true},
    {l:"Bank Charges & Interest",v:936000,sub:true},{l:"Admin & Professional fees",v:1650000,sub:true},
    {l:"Total Indirect Expenses",v:17250000,bold:true,sep:true},
    {l:"NET PROFIT",v:12750000,bold:true,hl:"#E6F1FB",hc:"#185FA5"},
  ]},
];
/* ── MODULE-WISE GP DATA (branch-aware) ──────────────────────── */

export const MODULE_GP={
  BOM:[
    {mod:"Flight",   icon:"✈", rev:28500000,cost:24800000,gp:3700000, gpPct:13.0,color:"#378ADD"},
    {mod:"Holiday",  icon:"🌴",rev:18400000,cost:14200000,gp:4200000, gpPct:22.8,color:"#1D9E75"},
    {mod:"Hotel",    icon:"🏨",rev:6200000, cost:4900000, gp:1300000, gpPct:21.0,color:"#BA7517"},
    {mod:"Car",      icon:"🚗",rev:2800000, cost:2100000, gp:700000,  gpPct:25.0,color:"#7F77DD"},
    {mod:"Visa",     icon:"🛂",rev:1850000, cost:1200000, gp:650000,  gpPct:35.1,color:"#D4537E"},
    {mod:"Insurance",icon:"🛡",rev:950000,  cost:0,       gp:950000,  gpPct:100, color:"#F5A623"},
    {mod:"Misc",     icon:"📦",rev:4800000, cost:0,       gp:4800000, gpPct:100, color:"#5F5E5A"},
  ],
  AMD:[
    {mod:"Flight",   icon:"✈", rev:4850000, cost:4200000, gp:650000,  gpPct:13.4,color:"#378ADD"},
    {mod:"Holiday",  icon:"🌴",rev:2400000, cost:1800000, gp:600000,  gpPct:25.0,color:"#1D9E75"},
    {mod:"Hotel",    icon:"🏨",rev:820000,  cost:620000,  gp:200000,  gpPct:24.4,color:"#BA7517"},
    {mod:"Car",      icon:"🚗",rev:380000,  cost:280000,  gp:100000,  gpPct:26.3,color:"#7F77DD"},
    {mod:"Visa",     icon:"🛂",rev:240000,  cost:155000,  gp:85000,   gpPct:35.4,color:"#D4537E"},
    {mod:"Insurance",icon:"🛡",rev:120000,  cost:0,       gp:120000,  gpPct:100, color:"#F5A623"},
    {mod:"Misc",     icon:"📦",rev:590000,  cost:0,       gp:590000,  gpPct:100, color:"#5F5E5A"},
  ],
  NBO:[
    {mod:"Flight",   icon:"✈", rev:1820000, cost:1560000, gp:260000,  gpPct:14.3,color:"#378ADD"},
    {mod:"Holiday",  icon:"🌴",rev:2400000, cost:1820000, gp:580000,  gpPct:24.2,color:"#1D9E75"},
    {mod:"Hotel",    icon:"🏨",rev:820000,  cost:610000,  gp:210000,  gpPct:25.6,color:"#BA7517"},
    {mod:"Car",      icon:"🚗",rev:480000,  cost:360000,  gp:120000,  gpPct:25.0,color:"#7F77DD"},
    {mod:"Visa",     icon:"🛂",rev:240000,  cost:155000,  gp:85000,   gpPct:35.4,color:"#D4537E"},
    {mod:"Insurance",icon:"🛡",rev:145000,  cost:0,       gp:145000,  gpPct:100, color:"#F5A623"},
    {mod:"Misc",     icon:"📦",rev:145000,  cost:0,       gp:145000,  gpPct:100, color:"#5F5E5A"},
  ],
  DAR:[
    {mod:"Flight",   icon:"✈", rev:1420000, cost:1220000, gp:200000,  gpPct:14.1,color:"#378ADD"},
    {mod:"Holiday",  icon:"🌴",rev:1850000, cost:1400000, gp:450000,  gpPct:24.3,color:"#1D9E75"},
    {mod:"Hotel",    icon:"🏨",rev:620000,  cost:460000,  gp:160000,  gpPct:25.8,color:"#BA7517"},
    {mod:"Car",      icon:"🚗",rev:320000,  cost:240000,  gp:80000,   gpPct:25.0,color:"#7F77DD"},
    {mod:"Visa",     icon:"🛂",rev:180000,  cost:116000,  gp:64000,   gpPct:35.6,color:"#D4537E"},
    {mod:"Insurance",icon:"🛡",rev:110000,  cost:0,       gp:110000,  gpPct:100, color:"#F5A623"},
    {mod:"Misc",     icon:"📦",rev:250000,  cost:0,       gp:250000,  gpPct:100, color:"#5F5E5A"},
  ],
  FBM:[
    {mod:"Flight",   icon:"✈", rev:98000,   cost:84000,   gp:14000,   gpPct:14.3,color:"#378ADD"},
    {mod:"Holiday",  icon:"🌴",rev:112000,  cost:84000,   gp:28000,   gpPct:25.0,color:"#1D9E75"},
    {mod:"Hotel",    icon:"🏨",rev:42000,   cost:31000,   gp:11000,   gpPct:26.2,color:"#BA7517"},
    {mod:"Car",      icon:"🚗",rev:22000,   cost:16000,   gp:6000,    gpPct:27.3,color:"#7F77DD"},
    {mod:"Visa",     icon:"🛂",rev:14000,   cost:9000,    gp:5000,    gpPct:35.7,color:"#D4537E"},
    {mod:"Insurance",icon:"🛡",rev:8000,    cost:0,       gp:8000,    gpPct:100, color:"#F5A623"},
    {mod:"Misc",     icon:"📦",rev:29000,   cost:0,       gp:29000,   gpPct:100, color:"#5F5E5A"},
  ],
};
/* Consolidated — sum all branches */
MODULE_GP.ALL=(()=>{
  const mods=["Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"];
  return mods.map((mod,mi)=>{
    const branches=["BOM","AMD","NBO","DAR","FBM"];
    const rev=branches.reduce((s,b)=>s+(MODULE_GP[b].find(m=>m.mod===mod)?.rev||0),0);
    const cost=branches.reduce((s,b)=>s+(MODULE_GP[b].find(m=>m.mod===mod)?.cost||0),0);
    const gp=rev-cost;
    return {mod:mod,icon:MODULE_GP.BOM[mi].icon,color:MODULE_GP.BOM[mi].color,
      rev:rev,cost:cost,gp:gp,gpPct:rev>0?+(gp/rev*100).toFixed(1):0};
  });
})();


export const PKG_D=[
  {file:"FILE-2026-0441",cust:"Mehta & Sons",pkg:"Bali 7N 2pax",dept:"2026-06-10",sale:285780,cost:140000,gst:12990,net:132790,margin:46.5,status:"Confirmed"},
  {file:"FILE-2026-0442",cust:"Sharma Enterprises",pkg:"Dubai 5N 4pax",dept:"2026-07-01",sale:412000,cost:210000,gst:9700,net:192300,margin:46.7,status:"Confirmed"},
  {file:"FILE-2026-0443",cust:"TechCorp Solutions",pkg:"Singapore MICE 20pax",dept:"2026-08-15",sale:1850000,cost:1200000,gst:42500,net:607500,margin:32.8,status:"Tentative"},
  {file:"FILE-2026-0444",cust:"Rohan",pkg:"Europe 12N 2pax",dept:"2026-09-20",sale:380000,cost:190000,gst:9000,net:181000,margin:47.6,status:"Confirmed"},
  {file:"FILE-2026-0445",cust:"Nexus Industries",pkg:"Maldives 5N 2pax",dept:"2026-07-10",sale:195000,cost:110000,gst:4250,net:80750,margin:41.4,status:"Cancelled"},
];

export const PKG_SC={Confirmed:{bg:"#EAF3DE",c:"#27500A"},Tentative:{bg:"#FAEEDA",c:"#854F0B"},Cancelled:{bg:"#FCEBEB",c:"#A32D2D"}};

export const GRP_COLORS={"Staff Costs":"#185FA5","Premises":"#27500A","Communication":"#854F0B",
  "Marketing":"#A32D2D","Operations":"#384677","Finance":"#1D9E75","Non-cash":"#5a6691"};


export function triggerBgtRefresh(){_EXP_BGT_LISTENERS.forEach(fn=>fn());}

export function getBgtKey(br,fy){return `${br?.code||br||"BOM"}_${fy}`;}

export function getExpenseBudget(br,fy){return _EXP_BUDGETS[getBgtKey(br,fy)]||{};}

export function saveExpenseBudget(br,fy,data){_EXP_BUDGETS[getBgtKey(br,fy)]=data;triggerBgtRefresh();}

/* ── Sample actuals Dec 2025 – May 2026 — all branches ── */


/* ── ROLE TEMPLATES ───────────────────────────────────────────── */

export const SUB_AGENTS_DATA=[
  {id:"SA-001",name:"Riya Travels & Tours",city:"Surat",state:"Gujarat",gstin:"24AABCR1234J1Z5",contact:"Riya Shah",mobile:"+91 98254 91111",email:"riya@riyatravels.in",commission:2.5,modules:["Flight","Holiday"],active:true,ytdBusiness:480000},
  {id:"SA-002",name:"Dream Holidays",city:"Pune",state:"Maharashtra",gstin:"27AABCD5678K1Z2",contact:"Dinesh Rane",mobile:"+91 98201 92222",email:"dream@dreamholidays.in",commission:3.0,modules:["Holiday","Hotel"],active:true,ytdBusiness:620000},
  {id:"SA-003",name:"Global Wings",city:"Nagpur",state:"Maharashtra",gstin:"27AABCG9012L1Z3",contact:"Pradeep Tiwari",mobile:"+91 98201 93333",email:"wings@globalwings.in",commission:2.0,modules:["Flight"],active:true,ytdBusiness:320000},
  {id:"SA-004",name:"Safari Connect",city:"Nairobi",country:"Kenya",gstin:"P0598765432X",contact:"John Mwangi",mobile:"+254 72 500 1234",email:"john@safariconnect.ke",commission:4.0,modules:["Holiday","Car"],active:true,ytdBusiness:2800000},
  {id:"SA-005",name:"Zanzibar Agents",city:"Dar es Salaam",country:"Tanzania",gstin:"TZ-234-567",contact:"Omar Said",mobile:"+255 75 500 5678",email:"omar@zanzibaragents.tz",commission:3.5,modules:["Holiday","Hotel"],active:true,ytdBusiness:8500000},
];

/* ── Forex rates ─── */

export const _PROFORMAS=[];

/* ── Notifications data ─── */

export const _NOTIFS=[...NOTIFICATIONS_DATA];

export const _NOTIF_LISTENERS=new Set();

export function triggerNotifRefresh(){_NOTIF_LISTENERS.forEach(fn=>fn());}

export function markNotifRead(id){
  const n=_NOTIFS.find(n=>n.id===id);
  if(n)n.read=true;
  triggerNotifRefresh();
}

export function markAllRead(){_NOTIFS.forEach(n=>n.read=true);triggerNotifRefresh();}

export const ACM_REASON_CODES={
  RC:{code:"RC",label:"Refund Credit",         desc:"Credit for refunded ticket through BSP"},
  CA:{code:"CA",label:"Commission Adjustment", desc:"Additional commission or incentive awarded"},
  AR:{code:"AR",label:"ADM Reversal",          desc:"Reversal of a previously raised ADM"},
  IC:{code:"IC",label:"Incentive Credit",      desc:"Volume incentive or override commission"},
  TC:{code:"TC",label:"Tax Credit",            desc:"Credit for excess tax collected"},
  MS:{code:"MS",label:"Miscellaneous",         desc:"Other credit — see remarks"},
};

/* ── ADM Sample Data ── */

export const ACM_DATA=[
  {id:"ACM-AI-2026-0415",date:"2026-04-15",airline:"Air India",airlineCode:"AI",iataNum:"098",
   ticketNo:"098-2156789008",passenger:"Sharma Enterprises",sector:"BOM-LHR",issueDate:"2026-03-09",
   reasonCode:"RC",amount:54000,currency:"INR",branch:"BOM",
   bspCreditDate:"2026-05-15",status:"Settled",
   remarks:"Full refund for cancelled BOM-LHR ticket — no penalty as per waiver"},
  {id:"ACM-EK-2026-0420",date:"2026-04-20",airline:"Emirates",airlineCode:"EK",iataNum:"176",
   ticketNo:"",passenger:"",sector:"—",issueDate:"",
   reasonCode:"IC",amount:18500,currency:"INR",branch:"BOM",
   bspCreditDate:"2026-05-20",status:"Applied",
   remarks:"Q1 FY26-27 incentive — 3% override on EK pax revenue exceeding target"},
  {id:"ACM-6E-2026-0501",date:"2026-05-01",airline:"IndiGo",airlineCode:"6E",iataNum:"526",
   ticketNo:"526-3456789001",passenger:"Gujarat Ceramics",sector:"AMD-DEL",issueDate:"2026-04-08",
   reasonCode:"TC",amount:590,currency:"INR",branch:"AMD",
   bspCreditDate:"2026-06-01",status:"Received",
   remarks:"Excess CESS collected — credit issued by IndiGo revenue accounting"},
  {id:"ACM-EK-2026-0508",date:"2026-05-08",airline:"Emirates",airlineCode:"EK",iataNum:"176",
   ticketNo:"",passenger:"ADM-EK-2026-0428 reversal",sector:"—",issueDate:"",
   reasonCode:"AR",amount:8400,currency:"INR",branch:"BOM",
   bspCreditDate:"2026-06-08",status:"Received",
   remarks:"ACM issued against ADM-EK-2026-0428 — dispute upheld, commission reinstated"},
  {id:"ACM-KQ-2026-0425",date:"2026-04-25",airline:"Kenya Airways",airlineCode:"KQ",iataNum:"706",
   ticketNo:"",passenger:"",sector:"—",issueDate:"",
   reasonCode:"CA",amount:128000,currency:"KES",branch:"NBO",
   bspCreditDate:"2026-05-25",status:"Settled",
   remarks:"Annual PLACI incentive — additional 1% on NBO-DXB route Q4 performance"},
];

/* ── ADM/ACM store (mutable for new entries) ── */

export const _ADM_LIST=[...ADM_DATA];

export const _ACM_LIST=[...ACM_DATA];

/* ════════════════════════════════════════════════════════════════
   ADM REGISTER  /purchase/adm
   Agent Debit Memos — airline debits via BSP
   ════════════════════════════════════════════════════════════════ */

export const _BOOKING_FILES={};
let _bfSeq={BOM:12,AMD:6,NBO:8,DAR:5,FBM:3};

export const BOOKING_FILES_SEED=[
  {id:"TK-BOM-2026-0401",branch:"BOM",client:"Sharma Enterprises",module:"Holiday",dest:"Dubai",
   pax:2,travel:"2026-06-10",status:"Confirmed",consultant:"Rahul M",
   advance:30000,totalValue:116000,collected:86000,
   vouchers:["BOM/1726/SH00019","BOM/1726/SF00044","BOM/1726/SV00009"],gp:26000},
  {id:"TK-BOM-2026-0402",branch:"BOM",client:"TechCorp MICE",module:"MICE",dest:"Singapore",
   pax:45,travel:"2026-09-10",status:"Deposit Received",consultant:"Amit K",
   advance:500000,totalValue:1680000,collected:500000,
   vouchers:["BOM/1726/SH00020","BOM/1726/SF00046"],gp:360000},
  {id:"TK-BOM-2026-0403",branch:"BOM",client:"Rohan",module:"Holiday",dest:"Maldives",
   pax:2,travel:"2026-07-20",status:"Proforma Sent",consultant:"Rahul M",
   advance:0,totalValue:98000,collected:0,
   vouchers:["BOM/1726/SPI00003"],gp:18000},
  {id:"TK-NBO-2026-0401",branch:"NBO",client:"Mujeet",module:"Holiday",dest:"Maasai Mara",
   pax:4,travel:"2026-06-15",status:"Fully Paid",consultant:"Kevin O",
   advance:1200000,totalValue:4200000,collected:4200000,
   vouchers:["NBO/1726/SH00010","NBO/1726/SF00021"],gp:1000000},
];
BOOKING_FILES_SEED.forEach(f=>{_BOOKING_FILES[f.id]=f;});

/* ── LEAVE DATA ── */

export const _LEAVES=[
  {id:"LV001",empId:"TK-BOM-003",empName:"Rohan",type:"Annual Leave",from:"2026-05-26",to:"2026-05-30",days:5,reason:"Family vacation",status:"Approved",approvedBy:"Priya S"},
  {id:"LV002",empId:"TK-BOM-003",empName:"Rohan",type:"Sick Leave",from:"2026-05-20",to:"2026-05-21",days:2,reason:"Fever and rest",status:"Approved",approvedBy:"Admin"},
  {id:"LV003",empId:"TK-AMD-002",empName:"Mohan",type:"Casual Leave",from:"2026-05-22",to:"2026-05-22",days:1,reason:"Personal work",status:"Pending",approvedBy:""},
  {id:"LV004",empId:"TK-NBO-003",empName:"Mujeet",type:"Annual Leave",from:"2026-06-01",to:"2026-06-05",days:5,reason:"Annual trip to Mombasa",status:"Pending",approvedBy:""},
];

export const _LEAVE_BALANCES={
  "TK-BOM-003":{AL:13,SL:10,CL:5},"TK-BOM-003":{AL:16,SL:12,CL:6},
  "TK-BOM-003":{AL:18,SL:12,CL:6},"TK-BOM-003":{AL:15,SL:11,CL:5},
  "TK-AMD-002":{AL:17,SL:12,CL:5},"TK-NBO-003":{AL:14,SL:10,CL:4},
};

/* ── EXPENSE CLAIMS DATA ── */

export const _EXPENSE_CLAIMS=[
  {id:"EXP001",empId:"TK-BOM-003",empName:"Rohan",date:"2026-05-10",category:"Travel",desc:"Auto to airport for client pick-up",amount:450,receipt:true,status:"Approved",paid:true},
  {id:"EXP002",empId:"TK-BOM-003",empName:"Rohan",date:"2026-05-12",category:"Entertainment",desc:"Client lunch — TechCorp MICE discussion",amount:3200,receipt:true,status:"Approved",paid:true},
  {id:"EXP003",empId:"TK-BOM-003",empName:"Rohan",date:"2026-05-14",category:"Stationery",desc:"Printer cartridges",amount:880,receipt:true,status:"Pending",paid:false},
  {id:"EXP004",empId:"TK-AMD-002",empName:"Mohan",date:"2026-05-08",category:"Travel",desc:"Bus to AMD for supplier meeting",amount:320,receipt:true,status:"Approved",paid:false},
  {id:"EXP005",empId:"TK-NBO-003",empName:"Mujeet",date:"2026-05-11",category:"Entertainment",desc:"Safari site visit — client familiarisation",amount:8500,receipt:true,status:"Pending",paid:false},
];

export const _DM_LISTENERS=new Set();

export function toggleDarkMode(){_DARK_MODE=!_DARK_MODE;_DM_LISTENERS.forEach(fn=>fn(_DARK_MODE));}

export function useDarkMode(){
  const [dark,setDark]=useState(_DARK_MODE);
  useEffect(()=>{_DM_LISTENERS.add(setDark);return()=>_DM_LISTENERS.delete(setDark);},[]);
  return [dark,toggleDarkMode];
}

/* ── TABLE ROW DENSITY ── */
let _DENSITY="comfortable"; // compact | comfortable | spacious

export const _DENSITY_LISTENERS=new Set();

export function setDensity(d){_DENSITY=d;_DENSITY_LISTENERS.forEach(fn=>fn(d));}

export function useDensity(){
  const [d,setD]=useState(_DENSITY);
  useEffect(()=>{_DENSITY_LISTENERS.add(setD);return()=>_DENSITY_LISTENERS.delete(setD);},[]);
  const pad={compact:"4px 8px",comfortable:"8px 12px",spacious:"13px 16px"}[d]||"8px 12px";
  const fs={compact:10.5,comfortable:11.5,spacious:12.5}[d]||11.5;
  return {density:d,pad:pad,fs:fs};
}

/* ── EXPORT TO CSV UTILITY ── */

export function UxPreferences(){
  const [dark,toggleDark]=useDarkMode();
  const {density}=useDensity();

  return (
    <div style={{padding:"12px 10px",maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⚙</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Display Preferences</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Personalise your KBiz360 experience</p>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>🌙 Dark Mode</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{margin:0,fontSize:12,color:"#384677"}}>Dark theme for low-light environments</p>
            <p style={{margin:"2px 0 0",fontSize:10,color:"#5a6691"}}>Currently: <b>{dark?"Dark":"Light"}</b></p>
          </div>
          <div onClick={toggleDark} style={{width:48,height:26,borderRadius:13,background:dark?"#0d1326":"#e1e3ec",cursor:"pointer",
            position:"relative",transition:"background 0.2s",border:`2px solid ${dark?"#d4a437":"#bfc3d6"}`}}>
            <div style={{position:"absolute",top:2,left:dark?22:2,width:18,height:18,borderRadius:"50%",
              background:dark?"#d4a437":"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
          </div>
        </div>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📏 Table Density</p>
        <div style={{display:"flex",gap:8}}>
          {["compact","comfortable","spacious"].map(d=>(
            <button key={d} onClick={()=>setDensity(d)} style={{
              flex:1,padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:600,
              textTransform:"capitalize",fontSize:11,
              background:density===d?"#0d1326":"#f3f4f8",
              color:density===d?"#d4a437":"#384677",
              border:`2px solid ${density===d?"#d4a437":"#e1e3ec"}`
            }}>{d}</button>
          ))}
        </div>
        <p style={{margin:"8px 0 0",fontSize:10,color:"#5a6691"}}>Compact = more rows visible. Spacious = easier reading. Currently: <b style={{textTransform:"capitalize"}}>{density}</b></p>
      </div>

      <div style={{...card,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>⌨ Keyboard Shortcuts</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Ctrl+K","Global Search / Command Palette"],["Ctrl+S","Save current voucher"],["Ctrl+N","New voucher (current module)"],["Esc","Close modal / cancel"],["Alt+D","Jump to Dashboard"],["Alt+S","Jump to Sales → Flight"],["Alt+P","Jump to Purchase → Flight"],["Alt+R","Jump to GP Reports"],].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 8px",borderRadius:7,background:"#f3f4f8"}}>
              <kbd style={{padding:"2px 8px",borderRadius:4,background:"#0d1326",color:"#d4a437",fontFamily:"monospace",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{k}</kbd>
              <span style={{fontSize:10.5,color:"#384677"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{...card}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#0d1326"}}>📊 Export Options</p>
        <p style={{margin:0,fontSize:11,color:"#5a6691"}}>Every report and table has an Export CSV button. Click it to download data to Excel. For PDF exports, use the Print button and select "Save as PDF" in the print dialog. The Itinerary Builder has direct HTML export.</p>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH A — EAGLE EYE / EXECUTIVE (Items 1–6)
   1. MIS One-Pager + Revenue Waterfall
   2. Client Concentration Risk
   3. Cash Runway metric (added to dashboard)
   4. Consolidated Balance Sheet
   5. Inter-branch elimination flag
   6. Advance / Deposit Ledger
   ════════════════════════════════════════════════════════════════ */

/* ── ITEM 1: MIS ONE-PAGER  /reports/mis ─────────────────────── */

export const _ADVANCES=[
  {id:"ADV-BOM-001",fileId:"TK-BOM-2026-0401",client:"Sharma Enterprises",date:"2026-05-10",received:30000,type:"Advance",mode:"NEFT",utr:"UTR9001234",adjustedAmt:0,status:"Unadjusted"},
  {id:"ADV-BOM-002",fileId:"TK-BOM-2026-0402",client:"TechCorp MICE",date:"2026-05-08",received:500000,type:"Advance",mode:"RTGS",utr:"UTR9001235",adjustedAmt:200000,status:"Partially Adjusted"},
  {id:"ADV-NBO-001",fileId:"TK-NBO-2026-0401",client:"Mujeet",date:"2026-05-12",received:1200000,type:"Advance",mode:"RTGS",utr:"KCB9001",adjustedAmt:1200000,status:"Fully Adjusted"},
  {id:"ADV-BOM-003",fileId:"",client:"Rohan",date:"2026-05-14",received:15000,type:"Booking Deposit",mode:"UPI",utr:"UPI9001",adjustedAmt:0,status:"No File Linked"},
];


export const _PASSPORTS=[
  {id:"PP001",client:"Sharma Enterprises",person:"Rajiv Sharma",type:"B2B",passport:"Z1234567",nationality:"Indian",issued:"2020-04-15",expiry:"2030-04-14",visas:["UAE - Multiple 2yr (Exp: 2027-03)","Schengen - C (Exp: 2025-12)"],branch:"BOM",dob:"1978-06-15",status:"Valid"},
  {id:"PP002",client:"Rohan",person:"Rohan",type:"B2C",passport:"P9876543",nationality:"Indian",issued:"2019-03-10",expiry:"2026-10-09",visas:["UK - Visit 6mo (Exp: 2026-08)"],branch:"BOM",dob:"1991-04-17",status:"Expiring Soon"},
  {id:"PP003",client:"Mehta & Sons",person:"Sunita Mehta",type:"B2B",passport:"K3456789",nationality:"Indian",issued:"2018-07-20",expiry:"2028-07-19",visas:["USA - B1/B2 10yr (Exp: 2028-07)"],branch:"BOM",dob:"1985-11-03",status:"Valid"},
  {id:"PP004",client:"Patel Exports",person:"Ravi Patel",type:"B2B",passport:"J4567891",nationality:"Indian",issued:"2021-11-05",expiry:"2031-11-04",visas:["Schengen - C Business (Exp: 2026-05)"],branch:"AMD",dob:"1982-08-22",status:"Visa Expiring"},
  {id:"PP005",client:"James Kamau",person:"James Kamau",type:"B2B",passport:"KE1234567",nationality:"Kenyan",issued:"2019-05-12",expiry:"2029-05-11",visas:["UAE - 30d Tourist (Exp: 2026-06)"],branch:"NBO",dob:"1989-02-20",status:"Valid"},
  {id:"PP006",client:"Mujeet",person:"Mujeet",type:"B2C",passport:"KE9876543",nationality:"Kenyan",issued:"2016-08-30",expiry:"2026-08-29",visas:[],branch:"NBO",dob:"1994-09-11",status:"Expiring Soon"},
];


export const _TICKET_CTRL=[
  {id:"TKT001",ticket:"098-2156789012",airline:"Air India",pax:"Rajiv Sharma",sector:"BOM-DXB",class:"Y",issueDate:"2026-05-07",travelDate:"2026-06-10",pnr:"ABCDE1",fare:41000,status:"Open",bspStatus:"Open",branch:"BOM"},
  {id:"TKT002",ticket:"098-2156789013",airline:"Air India",pax:"Sunita Sharma",sector:"BOM-DXB",class:"Y",issueDate:"2026-05-07",travelDate:"2026-06-10",pnr:"ABCDE1",fare:41000,status:"Open",bspStatus:"Open",branch:"BOM"},
  {id:"TKT003",ticket:"176-8901234567",airline:"Emirates",pax:"Priya Mehta",sector:"BOM-DXB-LHR",class:"C",issueDate:"2026-04-01",travelDate:"2026-05-15",pnr:"FGHIJ2",fare:69000,status:"Used",bspStatus:"Used",branch:"BOM"},
  {id:"TKT004",ticket:"526-3456789012",airline:"IndiGo",pax:"Rohan",sector:"BOM-DEL",class:"L",issueDate:"2026-04-22",travelDate:"2026-05-10",pnr:"KLMNO3",fare:7600,status:"Refunded",bspStatus:"Refunded",branch:"BOM"},
  {id:"TKT005",ticket:"098-3214567891",airline:"Air India",pax:"Ravi Patel",sector:"AMD-DEL",class:"V",issueDate:"2026-05-06",travelDate:"2026-05-25",pnr:"PQRST4",fare:9200,status:"Open",bspStatus:"Open",branch:"AMD"},
  {id:"TKT006",ticket:"706-9012345678",airline:"Kenya Airways",pax:"James Kamau",sector:"NBO-DXB",class:"Y",issueDate:"2026-03-15",travelDate:"2026-04-10",pnr:"UVWXY5",fare:560000,status:"Used",bspStatus:"Used",branch:"NBO"},
];


export const _MARKUP_RULES=[
  {id:"MR001",client:"ALL B2C",type:"B2C",module:"Flight",markupType:"Percentage",value:12,floor:8,currency:"INR",note:"Standard markup all B2C clients"},
  {id:"MR002",client:"ALL B2B",type:"B2B",module:"Flight",markupType:"Fixed Fee",value:1500,floor:8,currency:"INR",note:"Fixed service fee per sector"},
  {id:"MR003",client:"Sharma Enterprises",type:"B2B",module:"Holiday",markupType:"Percentage",value:18,floor:12,currency:"INR",note:"Premium account — higher markup"},
  {id:"MR004",client:"TechCorp MICE",type:"B2E",module:"ALL",markupType:"Percentage",value:10,floor:8,currency:"INR",note:"Corporate SLA — 10% on all modules"},
  {id:"MR005",client:"ALL B2C",type:"B2C",module:"Hotel",markupType:"Percentage",value:15,floor:10,currency:"INR",note:"Standard hotel markup"},
  {id:"MR006",client:"ALL B2B",type:"B2B",module:"Visa",markupType:"Fixed Fee",value:2000,floor:0,currency:"INR",note:"Fixed visa service fee per applicant"},
];


export function MarkupRateSheet({branch}){
  const [rules,setRules]=useState(_MARKUP_RULES);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({client:"ALL B2C",type:"B2C",module:"Flight",markupType:"Percentage",value:12,floor:8,note:""});

  /* GP floor alert checker */
  const alertCount=rules.filter(r=>r.floor>0&&r.value<r.floor).length;

  return (
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📐</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Markup / Net Rate Sheet</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Per-client markup rules · GP floor alerts · All modules</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Add Rule</button>
      </div>

      {alertCount>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={14}/> {alertCount} markup rule{alertCount>1?"s":""} below the GP floor — review pricing immediately
      </div>}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["ID","Client / Segment","Type","Module","Markup Type","Markup","GP Floor","Alert","Notes",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=5&&i<=6?"right":"left",color:"#d4a437",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rules.map((r,i)=>(
            <tr key={r.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{r.id}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{r.client}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{r.type}</span></td>
              <td style={{padding:"8px 12px",color:"#384677"}}>{r.module}</td>
              <td style={{padding:"8px 12px",color:"#5a6691"}}>{r.markupType}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,fontSize:14,color:"#27500A"}}>{r.markupType==="Percentage"?`${r.value}%`:`₹${r.value}`}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:r.value<r.floor?"#A32D2D":"#5a6691"}}>{r.floor>0?`${r.floor}% min`:"None"}</td>
              <td style={{padding:"8px 12px"}}>{r.value<r.floor?<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"#FCEBEB",color:"#A32D2D",fontWeight:700}}>Below Floor!</span>:<span style={{color:"#27500A",fontSize:14}}>✔</span>}</td>
              <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{r.note}</td>
              <td style={{padding:"8px 12px"}}><button onClick={()=>setRules(rs=>rs.filter(x=>x.id!==r.id))} style={{background:"transparent",border:"none",cursor:"pointer",color:"#A32D2D",fontSize:13}}>✕</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e1e3ec",display:"flex",justifyContent:"space-between"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>Add Markup Rule</p>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#5a6691"}}>✕</button>
            </div>
            <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Client / ALL B2B / ALL B2C"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} style={inp} placeholder="ALL B2C"/></FL>
                <FL label="Type"><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}><option>B2B</option><option>B2C</option><option>B2E</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label="Module"><select value={form.module} onChange={e=>setForm(f=>({...f,module:e.target.value}))} style={inp}>{["ALL","Flight","Holiday","Hotel","Car","Visa","Insurance","Misc"].map(m=><option key={m}>{m}</option>)}</select></FL>
                <FL label="Markup type"><select value={form.markupType} onChange={e=>setForm(f=>({...f,markupType:e.target.value}))} style={inp}><option>Percentage</option><option>Fixed Fee</option></select></FL>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FL label={form.markupType==="Percentage"?"Markup %":"Fixed fee (₹)"}><input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:+e.target.value}))} style={inp}/></FL>
                <FL label="GP floor % (0 = no floor)"><input type="number" value={form.floor} onChange={e=>setForm(f=>({...f,floor:+e.target.value}))} style={inp}/></FL>
              </div>
              <FL label="Note"><input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={inp}/></FL>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(false)} style={btnGh}>Cancel</button>
              <button onClick={()=>{
                const id=`MR${String(rules.length+1).padStart(3,"0")}`;
                setRules(rs=>[...rs,{...form,id}]);setModal(false);
              }} style={btnG}>💾 Save Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ITEM 10: VENDOR PAYMENT TERMS  /masters/vendor-terms ─────── */

export const _VENDOR_TERMS=[
  {id:"VT001",supplier:"BSP India",type:"BSP",terms:"Weekly — every Monday",days:7,dueAmt:214000,dueDate:"2026-05-20",status:"Due Soon"},
  {id:"VT002",supplier:"Air India",type:"Airline",terms:"30 days from invoice",days:30,dueAmt:88000,dueDate:"2026-06-06",status:"Upcoming"},
  {id:"VT003",supplier:"Emirates GSA",type:"Airline",terms:"30 days from invoice",days:30,dueAmt:155000,dueDate:"2026-06-07",status:"Upcoming"},
  {id:"VT004",supplier:"Bali Tours DMC",type:"DMC",terms:"50% advance, balance 7d before departure",days:7,dueAmt:107000,dueDate:"2026-06-03",status:"Upcoming"},
  {id:"VT005",supplier:"Island Escapes",type:"DMC",terms:"Full payment on confirmation",days:0,dueAmt:96000,dueDate:"2026-05-21",status:"Due Soon"},
  {id:"VT006",supplier:"VFS Global",type:"Visa Agency",terms:"Immediate on application",days:0,dueAmt:16800,dueDate:"2026-05-19",status:"Due Today"},
  {id:"VT007",supplier:"TATA AIG",type:"Insurer",terms:"Immediate on policy issue",days:0,dueAmt:6900,dueDate:"2026-05-20",status:"Due Soon"},
  {id:"VT008",supplier:"KQ Direct",type:"Airline",terms:"Weekly BSP settlement",days:7,dueAmt:760000,dueDate:"2026-05-26",status:"Upcoming"},
];

/* VendorTermsMaster — see rebuilt version below */

export const _TDS_CERTS=[
  {id:"16A-Q4-001",vendor:"Bali Tours DMC",pan:"AABCB1234D",section:"194C",quarter:"Q4 FY25-26",period:"Jan-Mar 2026",tdsAmt:8400,certNo:"CERT-Q4-001",issued:"2026-06-15",status:"Pending",dueDate:"2026-06-30"},
  {id:"16A-Q4-002",vendor:"Riya Travels",pan:"AABCR1234J",section:"194H",quarter:"Q4 FY25-26",period:"Jan-Mar 2026",tdsAmt:2400,certNo:"CERT-Q4-002",issued:"",status:"Pending",dueDate:"2026-06-30"},
  {id:"16A-Q3-001",vendor:"Island Escapes",pan:"AABCI9012K",section:"194C",quarter:"Q3 FY25-26",period:"Oct-Dec 2025",tdsAmt:5600,certNo:"CERT-Q3-001",issued:"2026-03-15",status:"Issued",dueDate:"2026-03-31"},
  {id:"16A-Q3-002",vendor:"Sai Cars",pan:"AABCS5678L",section:"194C",quarter:"Q3 FY25-26",period:"Oct-Dec 2025",tdsAmt:1200,certNo:"CERT-Q3-002",issued:"2026-03-14",status:"Issued",dueDate:"2026-03-31"},
  {id:"16A-Q3-003",vendor:"TATA AIG (Commission)",pan:"AABCT5678M",section:"194D",quarter:"Q3 FY25-26",period:"Oct-Dec 2025",tdsAmt:3400,certNo:"CERT-Q3-003",issued:"2026-03-16",status:"Acknowledged",dueDate:"2026-03-31"},
];


export function TdsCertRegister({branch}){
  const [certs,setCerts]=useState(_TDS_CERTS);
  const [quarter,setQuarter]=useState("All");
  const QUARTERS=["All","Q4 FY25-26","Q3 FY25-26","Q2 FY25-26","Q1 FY25-26"];
  const STATUS_CLR={Pending:"#A32D2D",Issued:"#185FA5",Acknowledged:"#27500A"};
  const STATUS_BG={Pending:"#FCEBEB",Issued:"#E6F1FB",Acknowledged:"#EAF3DE"};
  const TODAY="2026-05-19";
  const daysLeft=d=>d?Math.ceil((new Date(d)-new Date(TODAY))/(1000*60*60*24)):null;

  const filtered=certs.filter(c=>quarter==="All"||c.quarter===quarter);
  const pending=filtered.filter(c=>c.status==="Pending").length;
  const totTds=filtered.reduce((s,c)=>s+c.tdsAmt,0);

  return (
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📜</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>TDS Certificate Register — Form 16A</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Track certificates issued to vendors · Quarterly · Section 194C/H/J/D</p>
          </div>
        </div>
        <select value={quarter} onChange={e=>setQuarter(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
          {QUARTERS.map(q=><option key={q}>{q}</option>)}
        </select>
      </div>

      {pending>0&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:9,background:"#FCEBEB",border:"1px solid #F7C1C1",fontSize:10.5,color:"#A32D2D",fontWeight:600,display:"flex",gap:8}}>
        <AlertTriangle size={15}/> {pending} Form 16A certificate{pending>1?"s":""} pending issuance. Due by quarter-end — failure to issue attracts penalty ₹100/day.
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[{l:"Total Certs",v:String(filtered.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Pending Issue",v:String(pending),c:"#A32D2D",bg:"#FCEBEB"},
          {l:"Issued",v:String(filtered.filter(c=>c.status==="Issued").length),c:"#185FA5",bg:"#E6F1FB"},
          {l:"Acknowledged",v:String(filtered.filter(c=>c.status==="Acknowledged").length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Total TDS Covered",v:"₹"+totTds.toLocaleString(),c:"#854F0B",bg:"#FAEEDA"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"11px 13px",background:k.bg}}>
            <p style={{margin:0,fontSize:9,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Certificate ID","Vendor","PAN","Section","Quarter","TDS Amount","Cert No.","Issued On","Due Date","Status","Action"].map((h,i)=>(
              <th key={i} style={{padding:"9px 11px",textAlign:i===5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtered.map((c,i)=>{
            const dl=daysLeft(c.dueDate);
            return (
              <tr key={c.id} style={{borderBottom:"1px solid #f3f4f8",background:c.status==="Pending"&&dl&&dl<14?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#185FA5"}}>{c.id}</td>
                <td style={{padding:"8px 11px",fontWeight:600,color:"#0d1326"}}>{c.vendor}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:"#5a6691"}}>{c.pan}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{c.section}</span></td>
                <td style={{padding:"8px 11px",color:"#384677"}}>{c.quarter} ({c.period})</td>
                <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>₹{c.tdsAmt.toLocaleString()}</td>
                <td style={{padding:"8px 11px",fontFamily:"monospace",fontSize:9.5,color:c.certNo?"#27500A":"#bfc3d6"}}>{c.certNo||"Pending"}</td>
                <td style={{padding:"8px 11px",color:"#5a6691",whiteSpace:"nowrap"}}>{c.issued||"—"}</td>
                <td style={{padding:"8px 11px",color:dl&&dl<14?"#A32D2D":"#5a6691",fontWeight:dl&&dl<14?700:400,whiteSpace:"nowrap"}}>{c.dueDate}</td>
                <td style={{padding:"8px 11px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[c.status]||"#f3f4f8",color:STATUS_CLR[c.status]||"#5a6691"}}>{c.status}</span></td>
                <td style={{padding:"8px 11px"}}>
                  {c.status==="Pending"&&<button onClick={()=>setCerts(cs=>cs.map(x=>x.id===c.id?{...x,status:"Issued",issued:TODAY,certNo:`CERT-${c.quarter.replace(/ /g,"-")}-${String(Math.floor(Math.random()*900)+100)}`}:x))} style={{...btnG,padding:"2px 8px",fontSize:9.5,background:"#185FA5",whiteSpace:"nowrap"}}>Issue 16A</button>}
                  {c.status==="Issued"&&<button onClick={()=>setCerts(cs=>cs.map(x=>x.id===c.id?{...x,status:"Acknowledged"}:x))} style={{...btnGh,padding:"2px 8px",fontSize:9.5,whiteSpace:"nowrap"}}>Acknowledged</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── ITEM 15: SALARY REVISION TRACKER  /hr/salary-revision ─────── */

export const _SALARY_HISTORY=[
  {empId:"TK-BOM-003",empName:"Rohan",joined:"2021-04-01",revisions:[
    {date:"2022-04-01",basic:28000,incr:3000,pct:12,reason:"Annual increment"},
    {date:"2023-04-01",basic:31500,incr:3500,pct:12.5,reason:"Annual increment"},
    {date:"2024-04-01",basic:35000,incr:3500,pct:11.1,reason:"Annual + performance bonus"},
    {date:"2025-04-01",basic:35000,incr:0,pct:0,reason:"Deferred — office expansion"},
  ]},
  {empId:"TK-BOM-003",empName:"Rohan",joined:"2019-07-15",revisions:[
    {date:"2021-04-01",basic:42000,incr:4000,pct:10.5,reason:"Annual increment"},
    {date:"2022-04-01",basic:46000,incr:4000,pct:9.5,reason:"Promotion to Sales Manager"},
    {date:"2023-04-01",basic:52000,incr:6000,pct:13,reason:"Top performer 2022-23"},
    {date:"2024-04-01",basic:58000,incr:6000,pct:11.5,reason:"Annual increment"},
  ]},
  {empId:"TK-AMD-002",empName:"Mohan",joined:"2021-08-01",revisions:[
    {date:"2022-08-01",basic:22000,incr:2000,pct:10,reason:"1-year review"},
    {date:"2023-08-01",basic:24000,incr:2000,pct:9.1,reason:"Annual increment"},
    {date:"2025-08-01",basic:26000,incr:2000,pct:8.3,reason:"Scheduled review"},
  ]},
];

export const _REVISION_DUE=[
  {empId:"TK-BOM-003",empName:"Rohan",branch:"BOM",currentBasic:35000,lastRevision:"2024-04-01",nextDue:"2026-04-01",status:"OVERDUE",daysPast:48},
  {empId:"TK-BOM-003",empName:"Rohan",branch:"BOM",currentBasic:28000,lastRevision:"2024-01-10",nextDue:"2026-01-10",status:"OVERDUE",daysPast:129},
  {empId:"TK-BOM-003",empName:"Rohan",branch:"BOM",currentBasic:30000,lastRevision:"2025-09-01",nextDue:"2026-09-01",status:"Upcoming",daysPast:-105},
  {empId:"TK-AMD-002",empName:"Mohan",branch:"AMD",currentBasic:32000,lastRevision:"2024-04-01",nextDue:"2026-04-01",status:"OVERDUE",daysPast:48},
  {empId:"TK-NBO-003",empName:"Mujeet",branch:"NBO",currentBasic:48000,lastRevision:"2025-06-01",nextDue:"2026-06-01",status:"Upcoming",daysPast:-13},
];


export const _COL_VISIBILITY={};

export const _COL_LISTENERS=new Set();

export function getColVisibility(tableId,cols){if(!_COL_VISIBILITY[tableId])_COL_VISIBILITY[tableId]=cols.reduce((o,c)=>({...o,[c]:true}),{});return _COL_VISIBILITY[tableId];}

export function toggleCol(tableId,col){if(_COL_VISIBILITY[tableId])_COL_VISIBILITY[tableId][col]=!_COL_VISIBILITY[tableId][col];_COL_LISTENERS.forEach(fn=>fn());}

export function useColVisibility(tableId,cols){const [t,setT]=useState(0);useEffect(()=>{const fn=()=>setT(x=>x+1);_COL_LISTENERS.add(fn);return()=>_COL_LISTENERS.delete(fn);},[]);return getColVisibility(tableId,cols);}

/* ── GLOBAL PINNED ROUTES ── */
let _PINNED_ROUTES=JSON.parse('[]');

export const _PINNED_LISTENERS=new Set();

export function togglePin(route,label){const idx=_PINNED_ROUTES.findIndex(r=>r.route===route);if(idx>=0)_PINNED_ROUTES.splice(idx,1);else _PINNED_ROUTES.push({route,label});_PINNED_LISTENERS.forEach(fn=>fn());}

export function getPinned(){return[..._PINNED_ROUTES];}

export function usePinned(){const [t,setT]=useState(0);useEffect(()=>{const fn=()=>setT(x=>x+1);_PINNED_LISTENERS.add(fn);return()=>_PINNED_LISTENERS.delete(fn);},[]);return _PINNED_ROUTES;}

/* ── RECENT PAGES TRACKER ── */

export const _RECENT_PAGES=[];

export const _RECENT_LISTENERS=new Set();

export function trackPage(route,title){const existing=_RECENT_PAGES.findIndex(p=>p.route===route);if(existing>=0)_RECENT_PAGES.splice(existing,1);_RECENT_PAGES.unshift({route,title,ts:new Date().toLocaleTimeString()});if(_RECENT_PAGES.length>10)_RECENT_PAGES.pop();_RECENT_LISTENERS.forEach(fn=>fn());}

export function getRecent(){return[..._RECENT_PAGES];}

export function useRecent(){const [t,setT]=useState(0);useEffect(()=>{const fn=()=>setT(x=>x+1);_RECENT_LISTENERS.add(fn);return()=>_RECENT_LISTENERS.delete(fn);},[]);return _RECENT_PAGES;}

/* ── BREADCRUMB COMPONENT ── */

export function Breadcrumb({route}){
  const crumbs=[{l:"Dashboard",r:"/dashboard"}];
  const seg=route.split("/").filter(Boolean);
  seg.forEach((s,i)=>{
    const path="/"+seg.slice(0,i+1).join("/");
    const label=s.charAt(0).toUpperCase()+s.slice(1).replace(/-/g," ");
    crumbs.push({l:label,r:path});
  });
  if(crumbs.length<=1)return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 0 8px",flexWrap:"wrap"}}>
      {crumbs.map((c,i)=>(
        <span key={i} style={{display:"flex",alignItems:"center",gap:4}}>
          {i>0&&<ChevronRight size={12} style={{color:"#bfc3d6"}}/>}
          <span style={{fontSize:10.5,color:i===crumbs.length-1?"#0d1326":"#5a6691",
            fontWeight:i===crumbs.length-1?600:400}}>{c.l}</span>
        </span>
      ))}
    </div>
  );
}

/* ── COLUMN VISIBILITY TOGGLE COMPONENT ── */

export function ColVisToggle({tableId,columns,style:{}}){
  const [open,setOpen]=useState(false);
  useColVisibility(tableId,columns);
  const vis=getColVisibility(tableId,columns);
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{...btnGh,padding:"4px 10px",fontSize:10.5,display:"flex",alignItems:"center",gap:4}}>
        <Settings size={12}/> Columns
      </button>
      {open&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:498}} onClick={()=>setOpen(false)}/>
          <div style={{position:"absolute",right:0,top:36,zIndex:499,background:"#fff",borderRadius:10,
            boxShadow:"0 8px 24px rgba(0,0,0,0.15)",border:"1px solid #e1e3ec",padding:"8px 0",minWidth:160}}>
            {columns.map(col=>(
              <label key={col} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",fontSize:11,color:"#384677"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f3f4f8"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <input type="checkbox" checked={vis[col]!==false} onChange={()=>toggleCol(tableId,col)} style={{cursor:"pointer"}}/>
                {col}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── QUICK CREATE FLOATING BUTTON ── */

export function PinnedRecentSection({setRoute}){
  const pinned=usePinned();
  const recent=useRecent();
  const [showPinned,setShowPinned]=useState(true);
  const [showRecent,setShowRecent]=useState(true);

  if(pinned.length===0&&recent.length===0)return null;
  return (
    <div style={{borderBottom:"1px solid #1a2340",paddingBottom:6,marginBottom:6}}>
      {pinned.length>0&&(
        <div style={{marginBottom:4}}>
          <button onClick={()=>setShowPinned(s=>!s)} style={{background:"transparent",border:"none",color:"#5a6691",fontSize:9.5,fontWeight:700,padding:"4px 12px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:4}}>
            📌 PINNED {showPinned?"▾":"▸"}
          </button>
          {showPinned&&pinned.map((p,i)=>(
            <button key={i} onClick={()=>setRoute&&setRoute(p.route)} style={{background:"transparent",border:"none",color:"#d4a437",fontSize:10.5,padding:"4px 16px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10}}>⭐</span>{p.label}
            </button>
          ))}
        </div>
      )}
      {recent.length>0&&(
        <div>
          <button onClick={()=>setShowRecent(s=>!s)} style={{background:"transparent",border:"none",color:"#5a6691",fontSize:9.5,fontWeight:700,padding:"4px 12px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:4}}>
            🕐 RECENT {showRecent?"▾":"▸"}
          </button>
          {showRecent&&recent.slice(0,5).map((p,i)=>(
            <button key={i} onClick={()=>setRoute&&setRoute(p.route)} style={{background:"transparent",border:"none",color:"#8b94b3",fontSize:10,padding:"3px 16px",cursor:"pointer",width:"100%",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"}
              onMouseLeave={e=>e.currentTarget.style.color="#8b94b3"}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title||p.route}</span>
              <span style={{fontSize:8.5,color:"#5a6691",flexShrink:0}}>{p.ts}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ITEM 21: BSP CSV IMPORT  /purchase/bsp-import
   ════════════════════════════════════════════════════════════════ */

export function LedgerSelect({value,onChange,filter,placeholder,style:{}}){
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const filtered=LEDGER_REGISTRY.filter(l=>{
    const matchQ=!q||l.name.toLowerCase().includes(q.toLowerCase())||l.group.toLowerCase().includes(q.toLowerCase());
    const matchFilter=!filter||filter(l);
    return matchQ&&matchFilter;
  }).slice(0,12);
  const selected=LEDGER_REGISTRY.find(l=>l.id===value);
  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);
  },[]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <div onClick={()=>{setOpen(o=>!o);setQ("");}} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:32,...style}}>
        {selected
          ?<span style={{fontSize:11,color:"#0d1326",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name}</span>
          :<span style={{fontSize:11,color:"#bfc3d6"}}>{placeholder||"Select ledger..."}</span>
        }
        <ChevronDown size={12} style={{color:"#5a6691",flexShrink:0}}/>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:300,background:"#fff",
          border:"1px solid #e1e3ec",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",overflow:"hidden"}}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search..."
            style={{width:"100%",border:"none",borderBottom:"1px solid #e1e3ec",padding:"8px 12px",
              fontSize:11,outline:"none",boxSizing:"border-box"}}/>
          <div style={{maxHeight:200,overflowY:"auto"}}>
            {filtered.map(l=>(
              <div key={l.id} onClick={()=>{onChange(l.id);setOpen(false);}}
                style={{padding:"7px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",fontSize:11}}
                onMouseEnter={e=>e.currentTarget.style.background="#f0f4ff"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{color:"#0d1326",fontWeight:500}}>{l.name}</span>
                <span style={{fontSize:9.5,color:"#5a6691",marginLeft:8,flexShrink:0}}>{l.group}</span>
              </div>
            ))}
            {filtered.length===0&&<div style={{padding:"10px 12px",fontSize:11,color:"#5a6691"}}>No ledger found</div>}
          </div>
          <div style={{padding:"6px 10px",borderTop:"1px solid #f3f4f8",fontSize:9.5,color:"#5a6691"}}>
            {LEDGER_REGISTRY.length} ledgers · Type to filter
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RECEIPT VOUCHER — COMPLETE REBUILD
   Dr Bank / Cash  |  Cr Debtor (with TDS deduction)
   ════════════════════════════════════════════════════════════════ */

export const _TDS_ENTRIES=[
  {id:"TDS001",date:"2026-05-07",payee:"Bali Tours DMC",pan:"AABCB1234D",section:"194C",nature:"DMC Services",gross:96000,rate:2,tds:1920,net:94080,challanBsr:"",challanDate:"",challanSerial:"",status:"Deposited",quarter:"Q1 FY27"},
  {id:"TDS002",date:"2026-05-10",payee:"VFS Global India",pan:"AABCV9012K",section:"194J",nature:"Professional Services",gross:84000,rate:10,tds:8400,net:75600,challanBsr:"",challanDate:"",challanSerial:"",status:"Pending",quarter:"Q1 FY27"},
  {id:"TDS003",date:"2026-05-12",payee:"TATA AIG Insurance",pan:"AABCT5678M",section:"194D",nature:"Insurance Commission",gross:34500,rate:5,tds:1725,net:32775,challanBsr:"0600115",challanDate:"2026-05-07",challanSerial:"12345",status:"Deposited",quarter:"Q1 FY27"},
  {id:"TDS004",date:"2026-05-14",payee:"Riya Travels (Commission)",pan:"AABCR1234J",section:"194H",nature:"Commission Paid",gross:48000,rate:5,tds:2400,net:45600,challanBsr:"",challanDate:"",challanSerial:"",status:"Pending",quarter:"Q1 FY27"},
];

export const _TCS_ENTRIES=[
  {id:"TCS001",date:"2026-05-08",collector:"Sharma Enterprises",pan:"AABCS1234P",section:"206C(1G)",nature:"Foreign Holiday Package > ₹7L",gross:116000,rate:5,tcs:5800,depositDue:"2026-06-07",status:"Collected"},
  {id:"TCS002",date:"2026-05-15",collector:"TechCorp MICE",pan:"AABCT9876Q",section:"206C(1G)",nature:"International MICE > ₹7L",gross:1680000,rate:5,tcs:84000,depositDue:"2026-06-07",status:"Collected"},
];


export function MstrShell({title,icon,badge,badgeBg,badgeC,actions,children}){
  return (
    <div style={{padding:"12px 10px",maxWidth:1260,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:"#E6F1FB",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
            {icon}
          </div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326",letterSpacing:"-0.02em"}}>{title}</h2>
            {badge&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,fontWeight:700,
              background:badgeBg||"#E6F1FB",color:badgeC||"#185FA5"}}>{badge}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{actions}</div>
      </div>
      {children}
    </div>
  );
}

/* ── Modal wrapper ────────────────────────────────────────────── */

export function MstrModal({title,onClose,children}){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(7,11,26,0.65)",
      zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,
        maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"14px 18px",borderBottom:"1px solid #e1e3ec",position:"sticky",top:0,
          background:"#fff",zIndex:1}}>
          <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326"}}>{title}</p>
          <button onClick={onClose} style={{background:"transparent",border:"none",
            cursor:"pointer",fontSize:20,color:"#5a6691",lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:"16px 18px"}}>{children}</div>
        <div style={{padding:"12px 18px",borderTop:"1px solid #e1e3ec",
          display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
          <button onClick={onClose} style={btnGh}>Cancel</button>
          <button onClick={onClose} style={btnG}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   1. CHART OF ACCOUNTS
   ════════════════════════════════════════════════════════════════ */

export function TRow({l,v}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",
      fontSize:11.5,padding:"3px 0",borderBottom:"1px solid #f3f4f8"}}>
      <span style={{color:"#5a6691"}}>{l}</span>
      <span style={{fontVariantNumeric:"tabular-nums"}}>{v}</span>
    </div>
  );
}

/* ── Chip ── */

export function Chip({name,bg="#E6F1FB",c="#185FA5"}){
  return (
    <span style={{display:"inline-block",padding:"2px 8px",borderRadius:999,
      fontSize:10,fontWeight:600,background:bg,color:c,whiteSpace:"nowrap"}}>
      {name}
    </span>
  );
}

/* ── KpiCard ── */

export const TOUR_CODES_DATA=[
  {id:"DXB-4N-2P",name:"Dubai 4 Nights",dest:"Dubai",nights:4,days:5,pax:"FIT",base:55000,peak:68000,off:42000,mods:["Flight","Hotel","Transfers","Visa"],gp:12,active:true,tags:["Family","Honeymoon"],updated:"2026-04-15"},
  {id:"BKK-6N-2P",name:"Bangkok 6 Nights",dest:"Bangkok",nights:6,days:7,pax:"FIT",base:45000,peak:58000,off:38000,mods:["Flight","Hotel","Transfers"],gp:14,active:true,tags:["Budget","Backpacker"],updated:"2026-03-20"},
  {id:"MLE-5N-2P",name:"Maldives 5N All-Inclusive",dest:"Maldives",nights:5,days:6,pax:"FIT",base:180000,peak:240000,off:150000,mods:["Flight","Hotel","Transfers","Insurance"],gp:18,active:true,tags:["Honeymoon","Luxury"],updated:"2026-05-01"},
  {id:"EUR-10N-2P",name:"Europe 10N Multi-city",dest:"Europe",nights:10,days:11,pax:"FIT",base:220000,peak:280000,off:180000,mods:["Flight","Hotel","Transfers","Insurance","Visa"],gp:15,active:true,tags:["Adventure","Cultural"],updated:"2026-04-22"},
  {id:"GIT-DXB-30P",name:"Dubai Group 30 Pax",dest:"Dubai",nights:4,days:5,pax:"GIT",base:38000,peak:48000,off:32000,mods:["Flight","Hotel","Transfers","Visa","Insurance"],gp:20,active:true,tags:["Corporate","MICE"],updated:"2026-05-10"},
  {id:"SIN-4N-2P",name:"Singapore 4 Nights",dest:"Singapore",nights:4,days:5,pax:"FIT",base:65000,peak:80000,off:52000,mods:["Flight","Hotel","Transfers"],gp:13,active:true,tags:["Family","Shopping"],updated:"2026-02-28"},
];


export const RECURRING_DATA=[
  {id:"REC001",name:"Office Rent — BOM",type:"Journal",freq:"Monthly",day:1,dr:"Office Rent",cr:"HDFC Bank",amt:120000,lastRun:"2026-05-01",nextRun:"2026-06-01",active:true},
  {id:"REC002",name:"GDS Subscription — Amadeus",type:"Payment",freq:"Monthly",day:5,dr:"GDS Charges",cr:"HDFC Bank",amt:45000,lastRun:"2026-05-05",nextRun:"2026-06-05",active:true},
  {id:"REC003",name:"ERP Subscription",type:"Payment",freq:"Monthly",day:10,dr:"Software Subscriptions",cr:"ICICI Bank",amt:28000,lastRun:"2026-05-10",nextRun:"2026-06-10",active:true},
  {id:"REC004",name:"Internet & Telephone",type:"Payment",freq:"Monthly",day:15,dr:"Telephone & Internet",cr:"HDFC Bank",amt:18000,lastRun:"2026-05-15",nextRun:"2026-06-15",active:true},
  {id:"REC005",name:"Depreciation — Monthly",type:"Journal",freq:"Monthly",day:31,dr:"Depreciation Expense",cr:"Accumulated Depn — Computers",amt:5000,lastRun:"2026-04-30",nextRun:"2026-05-31",active:true},
];


export const GROUP_BOOKINGS=[
  {id:"GRP-BOM-001",name:"Sharma Family Group",dest:"Dubai",pax:12,travel:"2026-06-10",status:"Confirmed",type:"FIT Group",leader:"Rohit Sharma",hotel:"Marriott JBR",airline:"Air India",deposit:120000,total:660000,pending:540000,rooms:[{type:"Deluxe",qty:4,pax:8},{type:"Suite",qty:2,pax:4}]},
  {id:"GRP-BOM-002",name:"TechCorp MICE — Singapore",dest:"Singapore",pax:45,travel:"2026-09-10",status:"Quote Sent",type:"MICE",leader:"Anita Kapoor (HR)",hotel:"Marriott Tangs",airline:"Singapore Airlines",deposit:450000,total:2925000,pending:2475000,rooms:[{type:"Deluxe",qty:15,pax:30},{type:"Executive",qty:7,pax:14},{type:"Single",qty:1,pax:1}]},
  {id:"GRP-NBO-001",name:"Nairobi Safari Group",dest:"Masai Mara",pax:8,travel:"2026-07-01",status:"Deposit Paid",type:"FIT Group",leader:"James Kamau",hotel:"Angama Mara",airline:"Kenya Airways",deposit:80000,total:400000,pending:320000,rooms:[{type:"Tented Camp",qty:4,pax:8}]},
];


export function PackagePnL({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("YTD");
  const PERIODS=[{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"},{v:"YTD",l:"YTD 2026"}];
  const FY_MONTHS=["2026-04","2026-05"];
  const bills=useMemo(()=>GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&(b.mod==="Holiday"||b.mod==="MICE")&&(period==="YTD"?FY_MONTHS.includes(b.date.slice(0,7)):b.date.startsWith(period))),[brCode,period]);

  // Group by tour code (simulate from dest)
  const pkgMap={};
  bills.forEach(b=>{
    const tourCode=b.tourCode||`TC-${b.dest?.slice(0,3).toUpperCase()||"OTH"}`;
    if(!pkgMap[tourCode])pkgMap[tourCode]={code:tourCode,dest:b.dest||"Various",rev:0,cost:0,bks:0,pax:0};
    pkgMap[tourCode].rev+=b.sell;pkgMap[tourCode].cost+=b.cost;pkgMap[tourCode].bks++;pkgMap[tourCode].pax+=b.pax||2;
  });
  const rows=Object.values(pkgMap).map(p=>({...p,gp:p.rev-p.cost,gpPct:p.rev>0?+(( p.rev-p.cost)/p.rev*100).toFixed(1):0,gpPerPax:p.pax>0?Math.round((p.rev-p.cost)/p.pax):0})).sort((a,b)=>b.gp-a.gp);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#FAEEDA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Package P&L by Tour Code</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{rows.length} tour codes · {bills.length} holiday bookings · GP per package</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>exportToCSV(rows,["code","dest","bks","pax","rev","cost","gp","gpPct"],"package-pnl.csv")} style={{...btnGh,fontSize:11}}><Download size={12}/> CSV</button>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Tour Code","Destination","Bookings","Pax","Revenue","Cost","Gross Profit","GP%","GP/Pax","Rating"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={r.code} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:"#185FA5"}}>{r.code}</td>
              <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{r.dest}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.bks}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.pax}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.rev)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",color:"#A32D2D",fontVariantNumeric:"tabular-nums"}}>{f(r.cost)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(r.gp)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}><span style={{fontSize:10.5,padding:"2px 7px",borderRadius:999,fontWeight:800,background:r.gpPct>=15?"#EAF3DE":r.gpPct>=8?"#FAEEDA":"#FCEBEB",color:r.gpPct>=15?"#27500A":r.gpPct>=8?"#854F0B":"#A32D2D"}}>{r.gpPct}%</span></td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#384677"}}>{f(r.gpPerPax)}</td>
              <td style={{padding:"8px 12px",textAlign:"right"}}>{r.gpPct>=15?"⭐⭐⭐":r.gpPct>=10?"⭐⭐":"⭐"}</td>
            </tr>
          ))}
          {rows.length===0&&<tr><td colSpan={10} style={{padding:"24px",textAlign:"center",color:"#5a6691"}}>No holiday bookings for this period</td></tr>}
          </tbody>
          {rows.length>0&&<tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.rev,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#F7C1C1",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.cost,0))}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(rows.reduce((s,r)=>s+r.gp,0))}</td>
            <td colSpan={3}/>
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

/* ── SUB-AGENT COMMISSION STATEMENT ──────────────────────────── */

export function SubAgentStatement({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [agent,setAgent]=useState("SA001");
  const [period,setPeriod]=useState("2026-05");
  const PERIODS=[{v:"2026-04",l:"Apr 2026"},{v:"2026-05",l:"May 2026"}];
  const selAgent=SUBAGENTS?.find(s=>s.id===agent)||{name:"Skyline Travels",commType:"% of GP",commRate:15,creditDays:30};
  const bills=useMemo(()=>GP_BILLS.filter(b=>(!brCode||b.branch===brCode)&&b.date.startsWith(period)).slice(0,12),[brCode,period]);
  const commAmt=b=>selAgent.commType?.includes("%")?Math.round((b.sell-b.cost)*(selAgent.commRate||10)/100):(selAgent.commRate||500);
  const totRev=bills.reduce((s,b)=>s+b.sell,0);
  const totGP=bills.reduce((s,b)=>s+b.sell-b.cost,0);
  const totComm=bills.reduce((s,b)=>s+commAmt(b),0);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🤝</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Sub-Agent Commission Statement</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{selAgent.name} · {PERIODS.find(p=>p.v===period)?.l} · {selAgent.commType} {selAgent.commRate}{selAgent.commType?.includes("%")?"%":"₹"}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <select value={agent} onChange={e=>setAgent(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {(SUBAGENTS||[]).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}>
            {PERIODS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Commission Statement for ${period}: Total bookings ${bills.length}, Revenue ${f(totRev)}, Your commission ${f(totComm)}`)}`, "_blank","noopener")} style={{...btnG,fontSize:11,background:"#25D366"}}>💬 WhatsApp</button>
          <button onClick={()=>window.print()} style={{...btnGh,fontSize:11}}><Printer size={12}/> Print</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{...card,marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
<div style={{textAlign:"center",padding:"8px 10px",borderRadius:8,background:"#f3f4f8"}}><p style={{margin:0,fontSize:8.5,color:"#5a6691",textTransform:"uppercase"}}>Total Revenue</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{f(totRev)}</p></div><div style={{textAlign:"center",padding:"8px 10px",borderRadius:8,background:"#f3f4f8"}}><p style={{margin:0,fontSize:8.5,color:"#5a6691",textTransform:"uppercase"}}>Total GP</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{f(totGP)}</p></div><div style={{textAlign:"center",padding:"8px 10px",borderRadius:8,background:"#f3f4f8"}}><p style={{margin:0,fontSize:8.5,color:"#5a6691",textTransform:"uppercase"}}>Bookings</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{String(bills.length)}</p></div><div style={{textAlign:"center",padding:"8px 10px",borderRadius:8,background:"#f3f4f8"}}><p style={{margin:0,fontSize:8.5,color:"#5a6691",textTransform:"uppercase"}}>Commission Rate</p><p style={{margin:"2px 0 0",fontSize:13,fontWeight:700,color:"#0d1326"}}>{`${selAgent.commRate}${selAgent.commType?.includes("%")?"%":"\u20b9/bk"}`}</p></div><div style={{textAlign:"center",padding:"8px 10px",borderRadius:8,background:"#EAF3DE",border:"1px solid #C0DD97"}}><p style={{margin:0,fontSize:8.5,color:"#5a6691",textTransform:"uppercase"}}>Commission Due</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:800,color:"#27500A"}}>{f(totComm)}</p></div>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Date","Booking ID","Client","Module","Sell Price","GP","Commission"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{bills.map((b,i)=>(
            <tr key={b.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
              <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{b.date}</td>
              <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{b.id}</td>
              <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{b.client}</td>
              <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,background:"#E6F1FB",color:"#185FA5"}}>{b.mod}</span></td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(b.sell)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:"#27500A"}}>{f(b.sell-b.cost)}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#27500A",fontVariantNumeric:"tabular-nums"}}>{f(commAmt(b))}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={4} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>COMMISSION PAYABLE — {selAgent.name}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{f(totRev)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totGP)}</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totComm)}</td>
          </tr></tfoot>
        </table>
      </div>
      <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={{...btnG,background:"#27500A",fontSize:11}}>💸 Record Commission Payment</button>
      </div>
    </div>
  );
}

/* ── REFUND TRACKER ──────────────────────────────────────────── */

export const REFUNDS_DATA=[
  {id:"REF-BOM-001",bookingId:"BOM/1726/SH00012",client:"Sharma Enterprises",dest:"Bali",travel:"2026-05-15",cancelDate:"2026-04-28",reason:"Medical emergency",amount:142000,charges:35500,refundAmt:106500,status:"BSP Filed",bspRef:"REF-IN-2026-112",clientRefund:false,mode:"NEFT"},
  {id:"REF-BOM-002",bookingId:"BOM/1726/SF00008",client:"Mehta & Sons",dest:"London",travel:"2026-06-01",cancelDate:"2026-05-10",reason:"Visa rejected",amount:88000,charges:8800,refundAmt:79200,status:"Airline Refund Received",bspRef:"REF-IN-2026-098",clientRefund:false,mode:"NEFT"},
  {id:"REF-NBO-001",bookingId:"NBO/1726/SH00004",client:"Mujeet",dest:"Dubai",travel:"2026-05-20",cancelDate:"2026-05-18",reason:"Travel plans changed",amount:95000,charges:47500,refundAmt:47500,status:"Client Refund Done",bspRef:"REF-KE-2026-034",clientRefund:true,mode:"MPESA"},
];

export const STATUS_FLOW=["Cancellation Requested","BSP Filed","Airline Refund Received","Client Refund Done","Closed"];

export function Recruitment({branch}){
  const mob=useMobile();
  const [jobs,setJobs]=useState([
    {id:"JOB001",title:"Senior Travel Consultant",dept:"Operations",location:"Mumbai",type:"Full-time",salary:"₹35K–50K/mo",status:"Open",applicants:12,posted:"2026-05-01",skills:"GDS, Flight ticketing, holiday packages"},
    {id:"JOB002",title:"Accountant",dept:"Finance",location:"Ahmedabad",type:"Full-time",salary:"₹25K–35K/mo",status:"Open",applicants:8,posted:"2026-05-10",skills:"Tally, GST, bank reconciliation"},
    {id:"JOB003",title:"Accounts Executive — Nairobi",dept:"Management",location:"Nairobi",type:"Full-time",salary:"KES 150K–200K/mo",status:"Interviewing",applicants:5,posted:"2026-04-20",skills:"Travel industry experience, team management"},
  ]);
  const [modal,setModal]=useState(false);
  const STATUS_CLR={Open:"#185FA5",Interviewing:"#854F0B",Hired:"#27500A",Closed:"#5a6691"};
  const STATUS_BG ={Open:"#E6F1FB",Interviewing:"#FAEEDA",Hired:"#EAF3DE",Closed:"#f3f4f8"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👔</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Recruitment</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{jobs.filter(j=>j.status==="Open").length} open positions · {jobs.reduce((s,j)=>s+j.applicants,0)} total applicants</p>
          </div>
        </div>
        <button onClick={()=>setModal(true)} style={{...btnG,fontSize:11}}><Plus size={13}/> Post Job</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12}}>
        {jobs.map(j=>(
          <div key={j.id} style={{...card,borderTop:`3px solid ${STATUS_CLR[j.status]||"#384677"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0d1326"}}>{j.title}</p>
                <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{j.dept} · {j.location} · {j.type}</p>
              </div>
              <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:STATUS_BG[j.status],color:STATUS_CLR[j.status]}}>{j.status}</span>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:8}}>
              <div style={{flex:1,padding:"6px 10px",borderRadius:7,background:"#f3f4f8",textAlign:"center"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Applicants</p>
                <p style={{margin:"1px 0 0",fontSize:16,fontWeight:800,color:"#0d1326"}}>{j.applicants}</p>
              </div>
              <div style={{flex:2,padding:"6px 10px",borderRadius:7,background:"#f3f4f8"}}>
                <p style={{margin:0,fontSize:8.5,color:"#5a6691"}}>Salary range</p>
                <p style={{margin:"1px 0 0",fontSize:11,fontWeight:700,color:"#27500A"}}>{j.salary}</p>
              </div>
            </div>
            <p style={{margin:"0 0 10px",fontSize:10.5,color:"#5a6691"}}><b>Skills:</b> {j.skills}</p>
            <div style={{display:"flex",gap:6}}>
              <button style={{...btnG,fontSize:10,padding:"4px 12px",flex:1}}>View Applicants</button>
              <button onClick={()=>setJobs(js=>js.map(x=>x.id===j.id?{...x,status:x.status==="Open"?"Interviewing":x.status==="Interviewing"?"Hired":"Closed"}:x))} style={{...btnGh,fontSize:10,padding:"4px 10px"}}>{j.status==="Open"?"→ Interview":j.status==="Interviewing"?"→ Hire":"Close"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── TRAINING RECORDS ─────────────────────────────────────────── */

export function TrainingRecords({branch}){
  const mob=useMobile();
  const emps=HR_EMPLOYEES_DATA.filter(e=>branch==="ALL"||e.branch===branch?.code||true).slice(0,8);
  const TRAININGS=[
    {title:"Amadeus GDS Certification",provider:"Amadeus",type:"Technical",validity:24,mandatory:true},
    {title:"IATA Travel & Tourism",provider:"IATA",type:"Professional",validity:36,mandatory:true},
    {title:"GST for Travel Agents",provider:"CA Firm",type:"Compliance",validity:12,mandatory:true},
    {title:"Anti-Money Laundering",provider:"Internal",type:"Compliance",validity:12,mandatory:true},
    {title:"Sales & Communication",provider:"Internal",type:"Soft Skills",validity:0,mandatory:false},
  ];
  const TYPE_CLR={Technical:"#185FA5",Professional:"#854F0B",Compliance:"#A32D2D","Soft Skills":"#1D9E75"};
  const TYPE_BG ={Technical:"#E6F1FB",Professional:"#FAEEDA",Compliance:"#FCEBEB","Soft Skills":"#EAF3DE"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎓</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Training Records</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{TRAININGS.filter(t=>t.mandatory).length} mandatory certifications · Track compliance for all staff</p>
        </div>
      </div>

      {/* Training matrix */}
      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:800}}>
            <thead><tr style={{background:"#0d1326"}}>
              <th style={{padding:"9px 12px",textAlign:"left",color:"#d4a437",fontWeight:700,fontSize:9.5,minWidth:160}}>Employee</th>
              {TRAININGS.map((t,i)=>(
                <th key={i} style={{padding:"8px 10px",textAlign:"center",color:"#d4a437",fontWeight:700,fontSize:9,minWidth:100}}>
                  <div style={{marginBottom:2}}>{t.title.split(" ").slice(0,2).join(" ")}</div>
                  {t.mandatory&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:999,background:"#A32D2D33",color:"#d4a437"}}>Required</span>}
                </th>
              ))}
            </tr>
            </thead>
            <tbody>{emps.map((e,i)=>{
              const scores=[true,i<6,true,i<7,i<4]; // simulate completion
              return(
                <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}<br/><span style={{fontSize:9,color:"#5a6691"}}>{e.branch}</span></td>
                  {TRAININGS.map((t,j)=>(
                    <td key={j} style={{padding:"8px 10px",textAlign:"center"}}>
                      <span style={{fontSize:14}}>{scores[j]?"✅":"❌"}</span>
                    </td>
                  ))}
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      <div style={{marginTop:10,display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={{...btnG,fontSize:11}}>📅 Schedule Training</button>
        <button style={{...btnGh,fontSize:11}}><Download size={12}/> Compliance Report</button>
      </div>
    </div>
  );
}

/* ── DOCUMENT MANAGER ─────────────────────────────────────────── */

export function BudgetPlanning({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const [fy,setFy]=useState("FY 2026-27");
  const BUDGET_HEADS=[
    {cat:"Income",gl:"Revenue — All Modules",budget:120000000,actual:23180000,var:0},
    {cat:"Income",gl:"Commission Income",budget:8000000,actual:1480000,var:0},
    {cat:"Direct Cost",gl:"Airline & Hotel Purchase",budget:95000000,actual:18200000,var:0},
    {cat:"Expenses",gl:"Salaries & Wages",budget:12000000,actual:2080000,var:0},
    {cat:"Expenses",gl:"Office Rent",budget:1440000,actual:240000,var:0},
    {cat:"Expenses",gl:"GDS Charges",budget:540000,actual:90000,var:0},
    {cat:"Expenses",gl:"Advertising",budget:600000,actual:64000,var:0},
    {cat:"Expenses",gl:"Software Subscriptions",budget:336000,actual:56000,var:0},
    {cat:"Expenses",gl:"Other Expenses",budget:800000,actual:138000,var:0},
  ];
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const MONTHS=2; // Apr + May done
  const pct=n=>MONTHS>0?+(n/MONTHS/12*100).toFixed(1):0;

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📊</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Budget vs Actual</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>{fy} · {MONTHS}/12 months elapsed · {brCode||"Travkings Group"}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}><option>FY 2026-27</option><option>FY 2025-26</option></select>
          <button style={{...btnGh,fontSize:11}}><Download size={12}/> Export</button>
        </div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Category","GL Account","Annual Budget","YTD Actual","YTD Expected","Variance","Utilisation"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=2?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{BUDGET_HEADS.map((r,i)=>{
            const expected=Math.round(r.budget*MONTHS/12);
            const variance=r.actual-expected;
            const utilPct=r.budget>0?Math.round(r.actual/r.budget*100):0;
            const expectedPct=Math.round(MONTHS/12*100);
            const good=(r.cat==="Income"&&variance>=0)||(r.cat!=="Income"&&variance<=0);
            return(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f8",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:999,fontWeight:700,background:r.cat==="Income"?"#E6F1FB":r.cat==="Direct Cost"?"#FCEBEB":"#f3f4f8",color:r.cat==="Income"?"#185FA5":r.cat==="Direct Cost"?"#A32D2D":"#384677"}}>{r.cat}</span></td>
                <td style={{padding:"8px 12px",fontWeight:500,color:"#0d1326"}}>{r.gl}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f(r.budget)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{f(r.actual)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#5a6691",fontVariantNumeric:"tabular-nums"}}>{f(expected)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:good?"#27500A":"#A32D2D"}}>{variance>=0?"+":""}{f(variance)}</td>
                <td style={{padding:"8px 12px",textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                    <div style={{width:50,height:6,borderRadius:3,background:"#e1e3ec",overflow:"hidden"}}>
                      <div style={{width:`${Math.min(utilPct,100)}%`,height:"100%",background:good?"#27500A":"#A32D2D",borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:10.5,fontWeight:700,color:good?"#27500A":"#A32D2D"}}>{utilPct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   BATCH E — FINAL 4 MISSING SCREENS
   IntercompanyBilling · SeatInventory · ClientAccount360 · GratuityRegister · EWayBill
   ════════════════════════════════════════════════════════════════ */

/* ── INTERCOMPANY BILLING ────────────────────────────────────── */

export function SeatInventory({branch}){
  const mob=useMobile();
  const [search,setSearch]=useState("");
  const [date,setDate]=useState("2026-06-15");
  const SEATS=[
    {id:"SI001",flight:"AI-144",route:"BOM-DXB",date:"2026-06-15",aircraft:"B787",classConfig:[{cls:"Economy",total:250,held:18,sold:196,avail:36},{cls:"Business",total:30,held:2,sold:21,avail:7}],status:"Open",dep:"14:20"},
    {id:"SI002",flight:"EK-506",route:"BOM-DXB",date:"2026-06-15",aircraft:"A380",classConfig:[{cls:"Economy",total:420,held:22,sold:398,avail:0},{cls:"Business",total:58,held:3,sold:45,avail:10},{cls:"First",total:14,held:0,sold:12,avail:2}],status:"Near Full",dep:"03:30"},
    {id:"SI003",flight:"6E-1754",route:"BOM-DEL",date:"2026-06-15",aircraft:"A320",classConfig:[{cls:"Economy",total:186,held:8,sold:142,avail:36}],status:"Open",dep:"09:15"},
    {id:"SI004",flight:"AI-101",route:"DEL-LHR",date:"2026-06-16",aircraft:"B777",classConfig:[{cls:"Economy",total:240,held:14,sold:220,avail:6},{cls:"Business",total:48,held:1,sold:40,avail:7}],status:"Open",dep:"01:45"},
  ];
  const filtered=SEATS.filter(s=>!search||(s.flight+s.route).toLowerCase().includes(search.toLowerCase()));
  const STATUS_CLR={"Near Full":"#A32D2D",Open:"#27500A",Closed:"#5a6691"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>💺</div>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Seat Inventory</h2>
            <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>Seats held by Travkings · Monitor allocation vs availability</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inp,width:"auto",minHeight:32,fontSize:11}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Flight / route..." style={{...inp,width:160,minHeight:32,fontSize:11}}/>
          <button style={{...btnG,fontSize:11}}><Plus size={13}/> Reserve Seats</button>
        </div>
      </div>

      {filtered.map(s=>(
        <div key={s.id} style={{...card,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:42,height:42,borderRadius:10,background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✈</div>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                  <span style={{fontWeight:800,fontSize:14,color:"#0d1326"}}>{s.flight}</span>
                  <span style={{fontSize:10.5,color:"#5a6691"}}>{s.route}</span>
                  <span style={{fontSize:9,padding:"1px 6px",borderRadius:999,fontWeight:700,background:(STATUS_CLR[s.status]||"#384677")+"22",color:STATUS_CLR[s.status]||"#384677"}}>{s.status}</span>
                </div>
                <p style={{margin:0,fontSize:10.5,color:"#5a6691"}}>{s.date} · Dep {s.dep} · {s.aircraft}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...btnG,fontSize:10,padding:"4px 12px"}}>+ Reserve More</button>
              <button style={{...btnGh,fontSize:10,padding:"4px 10px"}}>Release Held</button>
            </div>
          </div>
          {/* Class config */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {s.classConfig.map((cls,ci)=>{
              const soldPct=Math.round(cls.sold/cls.total*100);
              const heldPct=Math.round(cls.held/cls.total*100);
              return(
                <div key={cls.cls} style={{flex:1,minWidth:160,padding:"10px 12px",borderRadius:9,border:"1px solid #e1e3ec",background:"#fafafa"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:11,color:"#0d1326"}}>{cls.cls}</span>
                    <span style={{fontSize:10.5,fontWeight:600,color:cls.avail===0?"#A32D2D":cls.avail<=10?"#854F0B":"#27500A"}}>{cls.avail} avail</span>
                  </div>
                  {/* Visual bar */}
                  <div style={{height:10,borderRadius:5,background:"#e1e3ec",overflow:"hidden",marginBottom:6,display:"flex"}}>
                    <div style={{width:`${soldPct}%`,background:"#185FA5",borderRadius:"5px 0 0 5px"}}/>
                    <div style={{width:`${heldPct}%`,background:"#d4a437"}}/>
                    <div style={{flex:1,background:"#EAF3DE"}}/>
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:9.5}}>
                    <span style={{color:"#185FA5"}}>■ Sold: {cls.sold}</span>
                    <span style={{color:"#d4a437"}}>■ Held: {cls.held}</span>
                    <span style={{color:"#27500A"}}>■ Free: {cls.avail}</span>
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:8.5,color:"#5a6691"}}>Total: {cls.total} · Load {soldPct+heldPct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── GRATUITY REGISTER ───────────────────────────────────────── */

export function GratuityRegister({branch}){
  const mob=useMobile();
  const brCode=branch==="ALL"?null:branch?.code;
  const emps=HR_EMPLOYEES_DATA.filter(e=>!brCode||e.branch===brCode);
  const DOJ_TO_YEARS=doj=>{const d=new Date(doj);const n=new Date("2026-05-19");return+((n-d)/(365.25*86400000)).toFixed(2);};
  const GRATUITY=e=>{
    const yrs=DOJ_TO_YEARS(e.joined||"2021-04-01");
    if(yrs<5)return{eligible:false,yrs:yrs,amount:0,note:"<5 years service"};
    const basic=e.basic+(e.da||0);
    const amt=Math.round(basic*yrs*15/26);
    return{eligible:true,yrs,amount:amt,note:`${yrs.toFixed(1)} yrs × 15/26`};
  };
  const data=emps.map(e=>({...e,...GRATUITY(e)}));
  const eligible=data.filter(e=>e.eligible);
  const f=n=>"₹"+Number(Math.round(n)).toLocaleString("en-IN");
  const totProvision=data.reduce((s,e)=>{const g=GRATUITY(e);const basic=(e.basic||0)+(e.da||0);return s+Math.round(basic*g.yrs*15/26);},0);

  return(
    <div style={{padding:"12px 10px",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#EAF3DE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎁</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:"#0d1326"}}>Gratuity Register</h2>
          <p style={{margin:"2px 0 0",fontSize:10.5,color:"#5a6691"}}>As per Payment of Gratuity Act 1972 · 15/26 × Basic+DA × Years · {eligible.length} eligible employees</p>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
        {[
          {l:"Total Employees",v:String(data.length),c:"#384677",bg:"#f3f4f8"},
          {l:"Eligible (≥5 yrs)",v:String(eligible.length),c:"#27500A",bg:"#EAF3DE"},
          {l:"Not Yet Eligible",v:String(data.length-eligible.length),c:"#854F0B",bg:"#FAEEDA"},
          {l:"Total Gratuity Provision",v:f(totProvision),c:"#185FA5",bg:"#E6F1FB"},
        ].map((k,i)=>(
          <div key={i} style={{...card,borderTop:`3px solid ${k.c}`,padding:"10px 12px",background:k.bg}}>
            <p style={{margin:0,fontSize:8.5,fontWeight:700,color:k.c,textTransform:"uppercase"}}>{k.l}</p>
            <p style={{margin:"3px 0 0",fontSize:mob?15:18,fontWeight:800,color:"#0d1326"}}>{k.v}</p>
          </div>
        ))}
      </div>

      <div style={{padding:"9px 14px",borderRadius:9,background:"#E6F1FB",border:"1px solid #B5D4F4",marginBottom:12,fontSize:10.5,color:"#185FA5"}}>
        Formula: <b>Gratuity = (Last drawn Basic+DA) × Years × 15 ÷ 26</b> · Maximum: ₹20,00,000 (₹20L) · Payable on resignation, retirement, or death/disability after 5 years of continuous service.
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
          <thead><tr style={{background:"#0d1326"}}>
            {["Employee","Branch","DOJ","Service","Basic+DA","Gratuity Provision","Eligible","Note"].map((h,i)=>(
              <th key={i} style={{padding:"9px 12px",textAlign:i>=4&&i<=5?"right":"left",color:"#d4a437",fontWeight:700,fontSize:9.5,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{data.map((e,i)=>{
            const g=GRATUITY(e);
            return(
              <tr key={e.id} style={{borderBottom:"1px solid #f3f4f8",background:g.eligible?"#f0fff4":i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"8px 12px",fontWeight:600,color:"#0d1326"}}>{e.name}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 6px",borderRadius:999,background:"#E6F1FB",color:"#185FA5",fontWeight:700}}>{e.branch}</span></td>
                <td style={{padding:"8px 12px",color:"#5a6691",whiteSpace:"nowrap"}}>{e.joined||"2021-04-01"}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:g.yrs>=5?"#27500A":"#854F0B"}}>{g.yrs.toFixed(1)} yrs</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{f((e.basic||0)+(e.da||0))}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums",color:g.eligible?"#27500A":"#5a6691"}}>{g.eligible?f(g.amount):"—"}</td>
                <td style={{padding:"8px 12px"}}><span style={{fontSize:9.5,padding:"2px 8px",borderRadius:999,fontWeight:700,background:g.eligible?"#EAF3DE":"#f3f4f8",color:g.eligible?"#27500A":"#5a6691"}}>{g.eligible?"Yes":"No"}</span></td>
                <td style={{padding:"8px 12px",fontSize:10,color:"#5a6691"}}>{g.note}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:"#0d1326",borderTop:"2px solid #d4a437"}}>
            <td colSpan={5} style={{padding:"9px 12px",fontWeight:700,color:"#d4a437",fontSize:12}}>TOTAL GRATUITY PROVISION (ALL EMPLOYEES)</td>
            <td style={{padding:"9px 12px",textAlign:"right",fontWeight:800,color:"#d4a437",fontVariantNumeric:"tabular-nums"}}>{f(totProvision)}</td>
            <td colSpan={2}/>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

/* ── E-WAY BILL ──────────────────────────────────────────────── */

export const ASSET_CATEGORIES = [
  {code:"COMP",  name:"Computers & Peripherals",   itRate:40, coRate:31.67, life:3,  block:"Block IV — Computer"},
  {code:"FURN",  name:"Furniture & Fixtures",      itRate:10, coRate:9.50,  life:10, block:"Block VII — Furniture"},
  {code:"VEHI",  name:"Motor Vehicles",            itRate:15, coRate:11.88, life:8,  block:"Block III — Vehicle"},
  {code:"OFEQ",  name:"Office Equipment",          itRate:15, coRate:13.91, life:5,  block:"Block VI — Plant"},
  {code:"BUIL",  name:"Building (Office)",         itRate:10, coRate:1.63,  life:60, block:"Block I — Building"},
  {code:"INTA",  name:"Software & Intangibles",    itRate:25, coRate:31.67, life:3,  block:"Block V — Intangible"},
  {code:"AC",    name:"Air Conditioners",          itRate:15, coRate:9.50,  life:10, block:"Block VI — Plant"},
];


export const FIXED_ASSETS_DATA = [
  {id:"FA-BOM-0001",code:"COMP",name:"Dell OptiPlex 7000 — Workstation",branch:"BOM",purchaseDate:"2024-04-15",cost:78000,salvage:3000,method:"WDV",wdv:46800,useStarted:"2024-04-15",status:"Active",location:"BOM HQ — Cabin 3"},
  {id:"FA-BOM-0002",code:"COMP",name:"HP LaserJet Pro M404 Printer",branch:"BOM",purchaseDate:"2024-06-10",cost:32500,salvage:1500,method:"WDV",wdv:21450,useStarted:"2024-06-10",status:"Active",location:"BOM HQ — Reception"},
  {id:"FA-BOM-0003",code:"FURN",name:"Office Workstations (6 units)",branch:"BOM",purchaseDate:"2023-11-20",cost:285000,salvage:15000,method:"SLM",wdv:228000,useStarted:"2023-11-20",status:"Active",location:"BOM HQ"},
  {id:"FA-BOM-0004",code:"AC",name:"Daikin 1.5T Split AC × 4",branch:"BOM",purchaseDate:"2024-03-05",cost:184000,salvage:9000,method:"WDV",wdv:138000,useStarted:"2024-03-05",status:"Active",location:"BOM HQ"},
  {id:"FA-AMD-0001",code:"COMP",name:"Lenovo ThinkCentre × 3",branch:"AMD",purchaseDate:"2024-08-22",cost:145000,salvage:7000,method:"WDV",wdv:108750,useStarted:"2024-08-22",status:"Active",location:"AMD Branch"},
  {id:"FA-AMD-0002",code:"VEHI",name:"Maruti Suzuki Dzire — Office",branch:"AMD",purchaseDate:"2023-04-12",cost:875000,salvage:200000,method:"WDV",wdv:631750,useStarted:"2023-04-12",status:"Active",location:"AMD Branch"},
  {id:"FA-NBO-0001",code:"OFEQ",name:"Conference Room Setup",branch:"NBO",purchaseDate:"2024-01-15",cost:425000,salvage:25000,method:"SLM",wdv:340000,useStarted:"2024-01-15",status:"Active",location:"NBO Branch"},
  {id:"FA-NBO-0002",code:"COMP",name:"MacBook Pro × 2 (Senior Mgmt)",branch:"NBO",purchaseDate:"2024-07-08",cost:380000,salvage:18000,method:"WDV",wdv:285000,useStarted:"2024-07-08",status:"Active",location:"NBO Branch"},
  {id:"FA-DAR-0001",code:"FURN",name:"Reception & Lounge Furniture",branch:"DAR",purchaseDate:"2024-02-28",cost:8500000,salvage:425000,method:"SLM",wdv:7395000,useStarted:"2024-02-28",status:"Active",location:"DAR Branch"},
  {id:"FA-FBM-0001",code:"INTA",name:"Travel CRM Software License",branch:"FBM",purchaseDate:"2024-05-01",cost:8500,salvage:0,method:"SLM",wdv:5950,useStarted:"2024-05-01",status:"Active",location:"FBM Branch"},
];


export const VENDOR_ADVANCES_DATA = [
  {id:"VA-BOM-2026-018",date:"2026-04-22",vendor:"Air India Ltd.",vendorType:"Airline",amount:500000,adjusted:380000,unadjusted:120000,ageDays:27,branch:"BOM",ref:"BSP Advance — Cycle 1",contact:"BSP Cell, AI HQ"},
  {id:"VA-BOM-2026-019",date:"2026-05-02",vendor:"Bali Tours DMC",vendorType:"DMC",amount:850000,adjusted:0,unadjusted:850000,ageDays:17,branch:"BOM",ref:"Pre-payment for May 28 group",contact:"Made Wirawan"},
  {id:"VA-BOM-2026-021",date:"2026-04-28",vendor:"Singapore MICE",vendorType:"DMC",amount:1240000,adjusted:925000,unadjusted:315000,ageDays:21,branch:"BOM",ref:"Corp event — TechCorp",contact:"Lim Wei Ming"},
  {id:"VA-NBO-2026-008",date:"2026-04-15",vendor:"Emirates Airlines",vendorType:"Airline",amount:42000,adjusted:35000,unadjusted:7000,ageDays:34,branch:"NBO",ref:"Block booking — Q2",contact:"NBO trade desk"},
  {id:"VA-NBO-2026-009",date:"2026-05-12",vendor:"Dubai Wonders DMC",vendorType:"DMC",amount:185000,adjusted:0,unadjusted:185000,ageDays:7,branch:"NBO",ref:"FAM trip — June",contact:"Aisha Khalid"},
  {id:"VA-AMD-2026-004",date:"2026-03-20",vendor:"Indigo Airlines",vendorType:"Airline",amount:75000,adjusted:75000,unadjusted:0,ageDays:60,branch:"AMD",ref:"Block — fully adjusted",contact:"6E SME desk"},
  {id:"VA-DAR-2026-003",date:"2026-04-10",vendor:"Thailand DMC Holidays",vendorType:"DMC",amount:18500000,adjusted:12000000,unadjusted:6500000,ageDays:39,branch:"DAR",ref:"Honeymoon series Apr-Jul",contact:"Suchart B."},
];


export const FX_REVAL_DATA = [
  {ledger:"Bali Tours DMC Payable",ccy:"USD",origAmt:5800,bookRate:83.20,monthEndRate:84.65,bookValue:482560,revalued:491070,fxGain:-8510,branch:"BOM"},
  {ledger:"Dubai Wonders Payable",ccy:"AED",origAmt:28500,bookRate:22.65,monthEndRate:23.05,bookValue:645525,revalued:656925,fxGain:-11400,branch:"BOM"},
  {ledger:"Singapore MICE Payable",ccy:"SGD",origAmt:18200,bookRate:61.50,monthEndRate:62.10,bookValue:1119300,revalued:1130220,fxGain:-10920,branch:"BOM"},
  {ledger:"TechCorp Receivable (USD)",ccy:"USD",origAmt:12500,bookRate:83.20,monthEndRate:84.65,bookValue:1040000,revalued:1058125,fxGain:18125,branch:"NBO"},
  {ledger:"Thailand DMC Payable",ccy:"THB",origAmt:520000,bookRate:2.32,monthEndRate:2.28,bookValue:1206400,revalued:1185600,fxGain:20800,branch:"DAR"},
  {ledger:"Emirates Payable (BSP)",ccy:"AED",origAmt:14200,bookRate:22.65,monthEndRate:23.05,bookValue:321630,revalued:327310,fxGain:-5680,branch:"NBO"},
];


export function FxRevaluation({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;
  const [period,setPeriod]=useState("2026-05");

  const rows=FX_REVAL_DATA.filter(r=>!brCode||r.branch===brCode);
  const totGain=rows.reduce((s,r)=>s+(r.fxGain>0?r.fxGain:0),0);
  const totLoss=rows.reduce((s,r)=>s+(r.fxGain<0?Math.abs(r.fxGain):0),0);
  const net=totGain-totLoss;

  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>💱 Period-End FX Revaluation</h2>
          <p style={{margin:"4px 0 0",fontSize:11.5,color:"#5a6691"}}>Mark foreign-currency balances to month-end rate · Auto-posts FX gain/loss JV · AS 11 / Ind AS 21</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{padding:"7px 10px",border:"1px solid #e1e3ec",borderRadius:7,fontSize:11.5}}>
            <option value="2026-05">May 2026</option><option value="2026-04">Apr 2026</option><option value="2026-03">Mar 2026</option>
          </select>
          <button style={{padding:"7px 14px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>📒 Post Revaluation JV</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unrealised Gain</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{cur+fmt(totGain)}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Unrealised Loss</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totLoss)}</p></div>
        <div style={{...card,borderTop:"3px solid "+(net>=0?"#27500A":"#A32D2D")}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Net Impact</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:net>=0?"#27500A":"#A32D2D"}}>{cur+fmt(net)}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Ledgers to Revalue</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{rows.length}</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Ledger</th><th style={{padding:"9px 8px",textAlign:"center"}}>Ccy</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>FCY Amount</th><th style={{padding:"9px 8px",textAlign:"right"}}>Book Rate</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Month-End Rate</th><th style={{padding:"9px 8px",textAlign:"right"}}>Book Value</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Revalued</th><th style={{padding:"9px 8px",textAlign:"right"}}>FX Gain/(Loss)</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{r.ledger}<div style={{fontSize:9.5,color:"#5a6691",fontWeight:400}}>{r.branch}</div></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:"#E6F1FB",color:"#185FA5"}}>{r.ccy}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{fmt(r.origAmt)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#5a6691"}}>{r.bookRate.toFixed(2)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontSize:10,color:"#854F0B",fontWeight:600}}>{r.monthEndRate.toFixed(2)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.bookValue)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right"}}>{cur+fmt(r.revalued)}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:r.fxGain>0?"#27500A":"#A32D2D"}}>{r.fxGain>0?"+":""}{cur+fmt(r.fxGain)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{background:"#FAEEDA",fontWeight:700,fontSize:11.5}}>
              <tr><td colSpan={7} style={{padding:"9px 8px",textAlign:"right"}}>NET FX REVALUATION</td>
              <td style={{padding:"9px 8px",textAlign:"right",color:net>=0?"#27500A":"#A32D2D"}}>{net>=0?"+":""}{cur+fmt(net)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p style={{marginTop:14,fontSize:10.5,color:"#5a6691",fontStyle:"italic"}}>
        💡 Posts JV: Dr/Cr Exchange Rate Difference vs each foreign-currency ledger. Reverses on next period close (AS 11).
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TAXATION ADDITIONS — GSTR-9C, 3CD Tax Audit, GSTR-2A Reconciliation
   ════════════════════════════════════════════════════════════════ */


export const MSME_OVERDUE_DATA = [
  {id:"BILL-002834",supplier:"Mumbai Print Works",msmeNo:"UDYAM-MH-19-0024850",billDate:"2026-02-15",dueDate:"2026-04-01",ageDays:78,outstanding:42500,branch:"BOM",risk:"Critical"},
  {id:"BILL-002967",supplier:"Quick Couriers Pvt Ltd",msmeNo:"UDYAM-MH-19-0018440",billDate:"2026-03-08",dueDate:"2026-04-22",ageDays:57,outstanding:18500,branch:"BOM",risk:"High"},
  {id:"BILL-003012",supplier:"AC Service Solutions",msmeNo:"UDYAM-GJ-08-0009212",billDate:"2026-03-22",dueDate:"2026-05-06",ageDays:43,outstanding:24800,branch:"AMD",risk:"Medium"},
  {id:"BILL-003056",supplier:"Office Equipment Co",msmeNo:"UDYAM-MH-19-0032110",billDate:"2026-03-28",dueDate:"2026-05-12",ageDays:37,outstanding:32000,branch:"BOM",risk:"Medium"},
  {id:"BILL-003198",supplier:"Local IT Solutions",msmeNo:"UDYAM-MH-19-0041520",billDate:"2026-04-10",dueDate:"2026-05-25",ageDays:24,outstanding:15800,branch:"BOM",risk:"Watch"},
];


export function MsmeTracker({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const brCode=branch==="ALL"?null:branch?.code;

  const bills=MSME_OVERDUE_DATA.filter(b=>!brCode||b.branch===brCode);
  const critical=bills.filter(b=>b.ageDays>=45);
  const high=bills.filter(b=>b.ageDays>=30&&b.ageDays<45);
  const watch=bills.filter(b=>b.ageDays<30);
  const totalAtRisk=critical.reduce((s,b)=>s+b.outstanding,0);
  const totalDisallow=Math.round(totalAtRisk*0.3); // potential income-tax disallowance
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>⚠️ MSME 45-Day Compliance Tracker</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Section 43B(h) of Income Tax Act · Pay MSME suppliers within 45 days or lose tax deduction</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Critical (&gt; 45 days)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{critical.length}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{cur+fmt(totalAtRisk)} at risk</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>High (30-45)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{high.length}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Watch (&lt; 30)</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{watch.length}</p></div>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Potential Tax Hit</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{cur+fmt(totalDisallow)}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>30% IT disallowance</p></div>
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Bill #</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>MSME Supplier</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>UDYAM Number</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Bill Date</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Due Date</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Outstanding</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Risk</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {bills.sort((a,b)=>b.ageDays-a.ageDays).map((b,i)=>(
                <tr key={b.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{b.id}</td>
                  <td style={{padding:"7px 8px",fontWeight:600}}>{b.supplier}</td>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#5a6691"}}>{b.msmeNo}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10}}>{b.billDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:b.ageDays>=45?700:400,color:b.ageDays>=45?"#A32D2D":"#5a6691"}}>{b.dueDate}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:b.ageDays>=45?"#A32D2D":b.ageDays>=30?"#854F0B":"#185FA5"}}>{b.ageDays}d</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700}}>{cur+fmt(b.outstanding)}</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:b.risk==="Critical"?"#FCEBEB":b.risk==="High"?"#FAEEDA":b.risk==="Medium"?"#E6F1FB":"#f3f4f8",color:b.risk==="Critical"?"#A32D2D":b.risk==="High"?"#854F0B":b.risk==="Medium"?"#185FA5":"#5a6691"}}>{b.risk}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><button style={{padding:"3px 10px",border:"none",background:"#d4a437",color:"#0d1326",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>Pay Now</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:12,padding:"10px 14px",background:"#FCEBEB",borderLeft:"4px solid #A32D2D",borderRadius:6}}>
        <p style={{margin:0,fontSize:11,color:"#A32D2D",fontWeight:700}}>⚠️ Statutory Alert — Section 43B(h)</p>
        <p style={{margin:"4px 0 0",fontSize:10.5,color:"#0d1326"}}>If MSME suppliers are not paid within 45 days (or as agreed, whichever is earlier), the expense becomes disallowable in the year of incurrence. Tax deduction is only available in the year of actual payment. Tag MSME flag in Supplier Master.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HR ADDITIONS — Employee Loans & Salary Advances
   ════════════════════════════════════════════════════════════════ */


export const PERIOD_LOCK_DATA = [
  {branch:"TKHO",period:"2026-03",lockedBy:"Faiz Patel (Sr. FM — TKHO)",  lockedOn:"2026-04-22",status:"Locked",   reason:"FY 2025-26 closed · Audit complete · Founder & Director signed off"},
  {branch:"TKHO",period:"2026-04",lockedBy:"Faiz Patel (Sr. FM — TKHO)",  lockedOn:"2026-05-22",status:"Locked",   reason:"GSTR-3B filed · TDS deposited"},
  {branch:"TKHO",period:"2026-05",lockedBy:"—",                            lockedOn:"—",         status:"Open",     reason:"Current period — open till filing"},
  {branch:"BOM", period:"2026-03",lockedBy:"Sughra Sayed (Sr. AE — TKHO)",lockedOn:"2026-04-22",status:"Locked",   reason:"GSTR-3B filed · TDS deposited"},
  {branch:"BOM", period:"2026-04",lockedBy:"Sughra Sayed (Sr. AE — TKHO)",lockedOn:"2026-05-22",status:"Locked",   reason:"GSTR-3B filed · TDS deposited"},
  {branch:"BOM", period:"2026-05",lockedBy:"—",                            lockedOn:"—",         status:"Open",     reason:"Current period — open till filing"},
  {branch:"AMD", period:"2026-04",lockedBy:"Sughra Sayed (Sr. AE — TKHO)",lockedOn:"2026-05-22",status:"Locked",   reason:"GSTR-3B filed"},
  {branch:"AMD", period:"2026-05",lockedBy:"—",                            lockedOn:"—",         status:"Open",     reason:"Current period"},
  {branch:"NBO", period:"2026-04",lockedBy:"Sughra Sayed (Sr. AE — TKHO)",lockedOn:"2026-05-20",status:"Locked",   reason:"KRA monthly return filed · Mujeet (NBO Accts Exec) reconciliation cleared"},
  {branch:"NBO", period:"2026-05",lockedBy:"—",                            lockedOn:"—",         status:"Soft Lock",reason:"Awaiting Mujeet (NBO Accts Exec) reconciliation"},
  {branch:"DAR", period:"2026-04",lockedBy:"—",                            lockedOn:"—",         status:"Open",     reason:"VAT return pending · Rujeet (DAR Accts Exec) to close"},
  {branch:"FBM", period:"2026-04",lockedBy:"Sughra Sayed (Sr. AE — TKHO)",lockedOn:"2026-05-15",status:"Locked",   reason:"Monthly close completed"},
];


export const APPROVAL_RULES = [
  {id:"AR-001",voucherType:"Payment Voucher",condition:"Amount > ₹50,000",            approver:"Sughra Sayed (Sr. AE — TKHO)",backup:"Faiz Patel (Sr. FM — TKHO)",sla:"4 hours", active:true},
  {id:"AR-002",voucherType:"Payment Voucher",condition:"Amount > ₹2,00,000",           approver:"Faiz Patel (Sr. FM — TKHO)", backup:"—",                          sla:"24 hours",active:true},
  {id:"AR-003",voucherType:"Journal Voucher",condition:"All journals (any amount)",    approver:"Sughra Sayed (Sr. AE — TKHO)",backup:"Faiz Patel (Sr. FM — TKHO)",sla:"4 hours", active:true},
  {id:"AR-004",voucherType:"Credit Note",    condition:"Amount > ₹25,000",            approver:"Sughra Sayed (Sr. AE — TKHO)",backup:"Faiz Patel (Sr. FM — TKHO)",sla:"4 hours", active:true},
  {id:"AR-005",voucherType:"Vendor Master",  condition:"New vendor creation",         approver:"Sughra Sayed (Sr. AE — TKHO)",backup:"Faiz Patel (Sr. FM — TKHO)",sla:"24 hours",active:true},
  {id:"AR-006",voucherType:"Vendor Master",  condition:"Bank A/c change",             approver:"Faiz Patel (Sr. FM — TKHO)", backup:"—",                          sla:"48 hours",active:true},
  {id:"AR-007",voucherType:"Cash Refund",    condition:"Amount > ₹10,000",            approver:"Sughra Sayed (Sr. AE — TKHO)",backup:"Faiz Patel (Sr. FM — TKHO)",sla:"4 hours", active:true},
  {id:"AR-008",voucherType:"Forex Trade",    condition:"All forex purchases",         approver:"Faiz Patel (Sr. FM — TKHO)", backup:"—",                          sla:"24 hours",active:true},
  {id:"AR-009",voucherType:"Period Lock",    condition:"Lock/unlock monthly periods",            approver:"Faiz Patel (Sr. FM — TKHO)",        backup:"Afshin Dhanani (Founder & Director)",sla:"Immediate",active:true},
  {id:"AR-010",voucherType:"Payment Voucher",condition:"Amount > ₹5,00,000 (above Sr. FM ceiling)",approver:"Faiz Patel (Sr. FM — TKHO)",         backup:"Afshin Dhanani (Founder & Director)",sla:"24 hours",active:true},
  {id:"AR-011",voucherType:"Payment Voucher",condition:"Amount > ₹25,00,000 (strategic)",       approver:"Afshin Dhanani (Founder & Director)",          backup:"—",                       sla:"48 hours",active:true},
  {id:"AR-012",voucherType:"Annual Filing",  condition:"GSTR-9, Income Tax Return sign-off",     approver:"Faiz Patel (Sr. FM — TKHO)",         backup:"Afshin Dhanani (Founder & Director)",sla:"7 days",  active:true},
  {id:"AR-013",voucherType:"Capex",          condition:"Fixed asset purchase > ₹2,00,000",       approver:"Faiz Patel (Sr. FM — TKHO)",         backup:"Afshin Dhanani (Founder & Director)",sla:"48 hours",active:true},
  {id:"AR-014",voucherType:"Bank Facility",  condition:"New loan / credit limit / OD increase",  approver:"Afshin Dhanani (Founder & Director)",          backup:"—",                       sla:"7 days",  active:true},
];


export const PENDING_APPROVALS_DATA = [
  {id:"PV-BOM-2026-457",type:"Payment Voucher",amount:285000,vendor:"Air India Ltd. — BSP",postedBy:"Rohan (Accts Exec — BOM)",  postedAt:"2026-05-19 09:42",approver:"Faiz Patel (Sr. FM — TKHO)",   ageHours:3,priority:"High",  notes:"BSP settlement — cycle 2"},
  {id:"JV-BOM-2026-198",type:"Journal Voucher",amount:48500, vendor:"Internal — Provision",  postedBy:"Rohan (Accts Exec — BOM)",  postedAt:"2026-05-19 10:15",approver:"Sughra Sayed (Sr. AE — TKHO)", ageHours:2,priority:"Medium",notes:"Bonus provision May"},
  {id:"CN-BOM-2026-088",type:"Credit Note",   amount:32000, vendor:"Sharma Enterprises",     postedBy:"Rohan (Accts Exec — BOM)",  postedAt:"2026-05-19 11:02",approver:"Sughra Sayed (Sr. AE — TKHO)", ageHours:1,priority:"Medium",notes:"Cancellation refund"},
  {id:"PV-NBO-2026-204",type:"Payment Voucher",amount:185000,vendor:"Dubai Wonders DMC",      postedBy:"Mujeet (Accts Exec — NBO)",  postedAt:"2026-05-19 08:20",approver:"Sughra Sayed (Sr. AE — TKHO)", ageHours:4,priority:"High",  notes:"FAM trip June advance"},
  {id:"VM-BOM-2026-012",type:"Vendor Master",  amount:0,     vendor:"NEW: Singapore Premier DMC",postedBy:"Rohan (Accts Exec — BOM)",postedAt:"2026-05-19 07:45",approver:"Sughra Sayed (Sr. AE — TKHO)", ageHours:5,priority:"Low",   notes:"New supplier onboarding"},
  {id:"PV-AMD-2026-156",type:"Payment Voucher",amount:78000, vendor:"Indigo Airlines",        postedBy:"Mohan (Accts Exec — AMD)",  postedAt:"2026-05-19 06:00",approver:"Sughra Sayed (Sr. AE — TKHO)", ageHours:7,priority:"Medium",notes:"Block booking deposit"},
];


export function PendingApprovals({branch,setRoute}){
  const mob=useMobile();
  const cfg=bc(branch);
  const cur=cfg.cur;
  const [filter,setFilter]=useState("All");

  const visible=filter==="All"?PENDING_APPROVALS_DATA:PENDING_APPROVALS_DATA.filter(p=>p.priority===filter);
  const totValue=visible.filter(p=>p.amount>0).reduce((s,p)=>s+p.amount,0);
  const high=PENDING_APPROVALS_DATA.filter(p=>p.priority==="High").length;
  const card={background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",padding:"12px 14px"};

  return(
    <div style={{padding:"12px 10px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{margin:0,fontSize:mob?16:19,fontWeight:800,color:"#0d1326"}}>📋 Pending Approvals Queue</h2>
      <p style={{margin:"4px 0 14px",fontSize:11.5,color:"#5a6691"}}>Vouchers awaiting checker approval · SLA-tracked · Approve/Reject/Return for revision</p>

      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{...card,borderTop:"3px solid #A32D2D"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Pending Total</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#A32D2D"}}>{PENDING_APPROVALS_DATA.length}</p></div>
        <div style={{...card,borderTop:"3px solid #854F0B"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>High Priority</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#854F0B"}}>{high}</p></div>
        <div style={{...card,borderTop:"3px solid #185FA5"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Value at Stake</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#185FA5"}}>{cur+fmt(totValue)}</p></div>
        <div style={{...card,borderTop:"3px solid #27500A"}}><p style={{margin:0,fontSize:10,color:"#5a6691",textTransform:"uppercase"}}>Within SLA</p><p style={{margin:"4px 0 0",fontSize:mob?16:20,fontWeight:800,color:"#27500A"}}>{PENDING_APPROVALS_DATA.filter(p=>p.ageHours<24).length}/{PENDING_APPROVALS_DATA.length}</p></div>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {["All","High","Medium","Low"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 12px",border:"1px solid "+(filter===f?"#0d1326":"#e1e3ec"),background:filter===f?"#0d1326":"#fff",color:filter===f?"#d4a437":"#5a6691",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>
        ))}
      </div>

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{background:"#0d1326",color:"#d4a437"}}><tr>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Voucher</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Type</th>
              <th style={{padding:"9px 8px",textAlign:"right"}}>Amount</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Vendor/Party</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Posted By</th>
              <th style={{padding:"9px 8px",textAlign:"left"}}>Approver</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Age</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Priority</th>
              <th style={{padding:"9px 8px",textAlign:"center"}}>Action</th>
            </tr></thead>
            <tbody>
              {visible.map((p,i)=>(
                <tr key={p.id} style={{background:i%2===0?"#fff":"#f3f4f8",borderBottom:"1px solid #e1e3ec"}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:10,color:"#185FA5"}}>{p.id}</td>
                  <td style={{padding:"7px 8px",fontSize:10.5}}>{p.type}</td>
                  <td style={{padding:"7px 8px",textAlign:"right",fontWeight:600}}>{p.amount>0?cur+fmt(p.amount):"—"}</td>
                  <td style={{padding:"7px 8px"}}>{p.vendor}<div style={{fontSize:9.5,color:"#5a6691"}}>{p.notes}</div></td>
                  <td style={{padding:"7px 8px",fontSize:10}}>{p.postedBy}</td>
                  <td style={{padding:"7px 8px",fontSize:10,color:"#185FA5",fontWeight:600}}>{p.approver}</td>
                  <td style={{padding:"7px 8px",textAlign:"center",fontWeight:600,fontSize:10,color:p.ageHours>4?"#A32D2D":p.ageHours>2?"#854F0B":"#27500A"}}>{p.ageHours}h</td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:9.5,fontWeight:700,background:p.priority==="High"?"#FCEBEB":p.priority==="Medium"?"#FAEEDA":"#E6F1FB",color:p.priority==="High"?"#A32D2D":p.priority==="Medium"?"#854F0B":"#185FA5"}}>{p.priority}</span></td>
                  <td style={{padding:"7px 8px",textAlign:"center"}}>
                    <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                      <button style={{padding:"3px 8px",border:"none",background:"#27500A",color:"#fff",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                      <button style={{padding:"3px 8px",border:"none",background:"#A32D2D",color:"#fff",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✗</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export const BANK_ACCOUNTS_DATA = [
  {id:"BA-001",branch:"TKHO",bank:"HDFC Bank",          accountNo:"50200012345678", ifsc:"HDFC0000045",branchAddr:"Lower Parel, Mumbai",type:"Current",currency:"INR",openingBal:2450000,limit:5000000,status:"Active"},
  {id:"BA-002",branch:"TKHO",bank:"HDFC Bank",          accountNo:"50200099887766", ifsc:"HDFC0000045",branchAddr:"Lower Parel, Mumbai",type:"USD Account",currency:"USD",openingBal:48500,limit:200000,status:"Active"},
  {id:"BA-003",branch:"TKHO",bank:"ICICI Bank",         accountNo:"000405001234",   ifsc:"ICIC0000004",branchAddr:"Fort, Mumbai",       type:"Current",currency:"INR",openingBal:825000, limit:2500000,status:"Active"},
  {id:"BA-004",branch:"BOM", bank:"HDFC Bank",          accountNo:"50200077654321", ifsc:"HDFC0000182",branchAddr:"Andheri W, Mumbai", type:"Current",currency:"INR",openingBal:1280000,limit:3000000,status:"Active"},
  {id:"BA-005",branch:"AMD", bank:"HDFC Bank",          accountNo:"50200055443322", ifsc:"HDFC0000156",branchAddr:"CG Road, Ahmedabad",type:"Current",currency:"INR",openingBal:580000, limit:1500000,status:"Active"},
  {id:"BA-006",branch:"NBO", bank:"KCB Bank",           accountNo:"1234567890",     ifsc:"KCBLKENX",   branchAddr:"Westlands, Nairobi",type:"Current",currency:"KES",openingBal:3450000,limit:8000000,status:"Active"},
  {id:"BA-007",branch:"DAR", bank:"CRDB Bank",          accountNo:"9876543210",     ifsc:"CORUTZTZ",   branchAddr:"Samora Ave, DAR",   type:"Current",currency:"TZS",openingBal:18500000,limit:50000000,status:"Active"},
  {id:"BA-008",branch:"FBM", bank:"Rawbank",            accountNo:"0050201234567",  ifsc:"RAWBCDKI",   branchAddr:"Av Mama Yemo, Lubumbashi",type:"Current",currency:"USD",openingBal:24800,limit:100000,status:"Active"},
  {id:"BA-009",branch:"TKHO",bank:"Petty Cash",         accountNo:"CASH-TKHO",       ifsc:"—",         branchAddr:"In office",          type:"Cash",   currency:"INR",openingBal:25000,  limit:50000,  status:"Active"},
];


export const CURRENCY_DATA = [
  {code:"INR",name:"Indian Rupee",      symbol:"₹",  dailyRate:1.0000,    lastUpdated:"2026-05-20 09:00",isBase:true, active:true},
  {code:"USD",name:"US Dollar",         symbol:"$",  dailyRate:84.5200,   lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"EUR",name:"Euro",              symbol:"€",  dailyRate:91.2400,   lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"GBP",name:"British Pound",     symbol:"£",  dailyRate:107.1500,  lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"AED",name:"UAE Dirham",        symbol:"د.إ", dailyRate:23.0200,   lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"SGD",name:"Singapore Dollar",  symbol:"S$", dailyRate:63.1800,   lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"KES",name:"Kenyan Shilling",   symbol:"KSh",dailyRate:0.6520,    lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"TZS",name:"Tanzanian Shilling",symbol:"TSh",dailyRate:0.0340,    lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
  {code:"CDF",name:"Congolese Franc",   symbol:"FC", dailyRate:0.0300,    lastUpdated:"2026-05-20 09:00",isBase:false,active:true},
];


export const COST_CENTERS_DATA = [
  {code:"TK-HQ",     name:"Head Office (TKHO)",       parent:"—",       manager:"Afshin Dhanani", active:true,  desc:"Parent cost center for corporate overhead"},
  {code:"TK-FIN",    name:"Finance Department",       parent:"TK-HQ",  manager:"Faiz Patel",     active:true,  desc:"Finance team operating costs"},
  {code:"TK-OPS",    name:"Operations Department",    parent:"TK-HQ",  manager:"Afshin Dhanani", active:true,  desc:"Operations overhead"},
  {code:"TK-IT",     name:"Information Technology",   parent:"TK-HQ",  manager:"Afshin Dhanani", active:true,  desc:"IT infrastructure + software"},
  {code:"TK-MKT",    name:"Marketing & Branding",     parent:"TK-HQ",  manager:"Afshin Dhanani", active:true,  desc:"Marketing campaigns, digital ads"},
  {code:"TK-BR-BOM", name:"BOM — Mumbai Branch",      parent:"—",       manager:"Rohan",          active:true,  desc:"Mumbai branch operations"},
  {code:"TK-BR-AMD", name:"AMD — Ahmedabad Branch",   parent:"—",       manager:"Mohan",          active:true,  desc:"Ahmedabad branch operations"},
  {code:"TK-BR-NBO", name:"NBO — Nairobi Branch",     parent:"—",       manager:"Mujeet",         active:true,  desc:"Nairobi branch operations"},
  {code:"TK-BR-DAR", name:"DAR — Dar es Salaam Branch",parent:"—",      manager:"Rujeet",         active:true,  desc:"Dar es Salaam branch operations"},
  {code:"TK-BR-FBM", name:"FBM — Lubumbashi Branch",  parent:"—",       manager:"Sujeet",         active:true,  desc:"Lubumbashi branch operations"},
];


export const PROJECTS_DATA = [
  {code:"TC-2026-001",name:"Europe Summer 2026 Package", client:"L&T Limited",         startDate:"2026-06-15",endDate:"2026-07-05",manager:"Rohan",  budget:4500000, actual:3850000,status:"Active"},
  {code:"TC-2026-002",name:"Dubai Family Tour",          client:"R.S. Mehta Family",   startDate:"2026-06-01",endDate:"2026-06-08",manager:"Rohan",  budget:850000,  actual:0,      status:"Quoted"},
  {code:"TC-2026-003",name:"Kenya Safari Group",         client:"Adventure Club India",startDate:"2026-07-10",endDate:"2026-07-20",manager:"Mujeet", budget:6200000, actual:0,      status:"Quoted"},
  {code:"TC-2026-004",name:"Greenfield School Trip",     client:"Greenfield School",   startDate:"2026-12-15",endDate:"2026-12-22",manager:"Mohan",  budget:2800000, actual:0,      status:"Booked"},
  {code:"TC-2026-005",name:"Bali Honeymoon Package",     client:"Kumar Wedding",       startDate:"2026-05-25",endDate:"2026-06-02",manager:"Rohan",  budget:680000,  actual:680000, status:"Completed"},
  {code:"TC-2026-006",name:"Singapore MICE — TechCorp",  client:"TechCorp Solutions",  startDate:"2026-09-10",endDate:"2026-09-14",manager:"Rohan",  budget:3200000, actual:0,      status:"Quoted"},
  {code:"TC-2025-052",name:"Tanzania Migration Safari",  client:"Wildlife Photo Club", startDate:"2025-08-20",endDate:"2025-08-30",manager:"Rujeet", budget:5400000, actual:5180000,status:"Completed"},
];


export const DOCUMENT_TYPES_DATA = [
  {id:"DT-001",type:"Tax Invoice",                layout:"GST Standard",     header:"Travkings Tax Invoice",      footer:"Subject to Mumbai Jurisdiction", logo:"travkings-logo.png",numberingSeries:"TKHO/INV/{YY}/{####}",active:true},
  {id:"DT-002",type:"Bill of Supply",             layout:"Non-GST Standard", header:"Travkings Bill of Supply",   footer:"Subject to Mumbai Jurisdiction", logo:"travkings-logo.png",numberingSeries:"TKHO/BOS/{YY}/{####}",active:true},
  {id:"DT-003",type:"Receipt Voucher",            layout:"Voucher Standard", header:"Travkings Receipt Voucher",  footer:"Computer generated",             logo:"travkings-logo.png",numberingSeries:"{BR}/RV/{YY}/{####}",active:true},
  {id:"DT-004",type:"Payment Voucher",            layout:"Voucher Standard", header:"Travkings Payment Voucher",  footer:"Computer generated",             logo:"travkings-logo.png",numberingSeries:"{BR}/PV/{YY}/{####}",active:true},
  {id:"DT-005",type:"Credit Note",                layout:"Note Standard",    header:"Travkings Credit Note",      footer:"Subject to Mumbai Jurisdiction", logo:"travkings-logo.png",numberingSeries:"{BR}/CN/{YY}/{####}",active:true},
  {id:"DT-006",type:"Debit Note",                 layout:"Note Standard",    header:"Travkings Debit Note",       footer:"Subject to Mumbai Jurisdiction", logo:"travkings-logo.png",numberingSeries:"{BR}/DN/{YY}/{####}",active:true},
  {id:"DT-007",type:"Quotation / Estimate",       layout:"Quotation Standard",header:"Travkings Quotation",        footer:"Valid for 15 days",             logo:"travkings-logo.png",numberingSeries:"{BR}/QT/{YY}/{####}",active:true},
  {id:"DT-008",type:"Visa Application Cover",     layout:"Letter Standard",  header:"Travkings — Authorised Travel Agent",footer:"For visa office use",      logo:"travkings-logo.png",numberingSeries:"{BR}/VA/{YY}/{####}",active:true},
  {id:"DT-009",type:"Hotel Voucher",              layout:"Voucher Standard", header:"Travkings Hotel Voucher",    footer:"Show at check-in",               logo:"travkings-logo.png",numberingSeries:"{BR}/HV/{YY}/{####}",active:true},
  {id:"DT-010",type:"Vehicle / Transfer Voucher", layout:"Voucher Standard", header:"Travkings Transfer Voucher", footer:"Show to driver at pickup",       logo:"travkings-logo.png",numberingSeries:"{BR}/TV/{YY}/{####}",active:true},
];


export const APPROVAL_LIMITS_DATA = [
  /* Payment Voucher */
  {id:"AL-001",role:"Accounts Executive",    voucherType:"Payment Voucher", minAmount:0,       maxAmount:50000,    backup:"Sr. Accounts Executive"},
  {id:"AL-002",role:"Sr. Accounts Executive",voucherType:"Payment Voucher", minAmount:50001,   maxAmount:200000,   backup:"Senior Finance Manager"},
  {id:"AL-003",role:"Senior Finance Manager",voucherType:"Payment Voucher", minAmount:200001,  maxAmount:2500000,  backup:"Director"},
  {id:"AL-004",role:"Director",              voucherType:"Payment Voucher", minAmount:2500001, maxAmount:999999999,backup:"—"},
  /* Journal Voucher */
  {id:"AL-005",role:"Accounts Executive",    voucherType:"Journal Voucher", minAmount:0,       maxAmount:0,        backup:"Sr. Accounts Executive"},
  {id:"AL-006",role:"Sr. Accounts Executive",voucherType:"Journal Voucher", minAmount:0,       maxAmount:100000,   backup:"Senior Finance Manager"},
  {id:"AL-007",role:"Senior Finance Manager",voucherType:"Journal Voucher", minAmount:100001,  maxAmount:999999999,backup:"Director"},
  /* Credit Note */
  {id:"AL-008",role:"Sr. Accounts Executive",voucherType:"Credit Note",     minAmount:0,       maxAmount:25000,    backup:"Senior Finance Manager"},
  {id:"AL-009",role:"Senior Finance Manager",voucherType:"Credit Note",     minAmount:25001,   maxAmount:500000,   backup:"Director"},
  {id:"AL-010",role:"Director",              voucherType:"Credit Note",     minAmount:500001,  maxAmount:999999999,backup:"—"},
  /* Cash Refund */
  {id:"AL-011",role:"Sr. Accounts Executive",voucherType:"Cash Refund",     minAmount:0,       maxAmount:10000,    backup:"Senior Finance Manager"},
  {id:"AL-012",role:"Senior Finance Manager",voucherType:"Cash Refund",     minAmount:10001,   maxAmount:200000,   backup:"Director"},
  /* Forex Trade */
  {id:"AL-013",role:"Senior Finance Manager",voucherType:"Forex Trade",     minAmount:0,       maxAmount:5000000,  backup:"Director"},
  /* Period Lock */
  {id:"AL-014",role:"Senior Finance Manager",voucherType:"Period Lock",     minAmount:0,       maxAmount:0,        backup:"Director"},
];


export const MASTER_PAGE = (title, subtitle, children) => (
  <div style={{padding:18,maxWidth:1320,margin:"0 auto"}}>
    <div style={{marginBottom:16}}>
      <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
      <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
    </div>
    {children}
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   1. BANK ACCOUNT MASTER
   ════════════════════════════════════════════════════════════════════ */


export function DocumentTypeMaster(){
  return MASTER_PAGE("Document Type Master","Configurable templates for invoices, receipts, certificates — header, footer, logo, numbering",
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,color:"#5a6691"}}>10 document templates configured · {DOCUMENT_TYPES_DATA.filter(d=>d.active).length} active</p>
        <div style={{flex:1}}/>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📥 Import</button>
        <button style={{padding:"8px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:12,cursor:"pointer"}}>📤 Export</button>
        <button style={{padding:"8px 16px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>+ Add Document Type</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:12}}>
        {DOCUMENT_TYPES_DATA.map(d=>(
          <div key={d.id} style={{background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <p style={{margin:0,fontSize:13.5,fontWeight:700,color:"#0d1326"}}>{d.type}</p>
              <span style={{padding:"2px 7px",background:d.active?"#d4edda":"#f8d7da",color:d.active?"#155724":"#721c24",borderRadius:3,fontSize:10.5,fontWeight:600}}>{d.active?"Active":"Inactive"}</span>
            </div>
            <div style={{fontSize:11.5,lineHeight:1.6,color:"#5a6691",marginBottom:10}}>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Layout:</span> {d.layout}</p>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Header:</span> {d.header}</p>
              <p style={{margin:0}}><span style={{fontWeight:700,color:"#0d1326"}}>Footer:</span> {d.footer}</p>
              <p style={{margin:0,fontFamily:"monospace"}}><span style={{fontWeight:700,color:"#0d1326",fontFamily:"sans-serif"}}>Numbering:</span> {d.numberingSeries}</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{padding:"5px 10px",background:"transparent",border:"1px solid #d4a437",color:"#d4a437",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600,flex:1}}>Edit Layout</button>
              <button style={{padding:"5px 10px",background:"transparent",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:4,fontSize:11,cursor:"pointer",fontWeight:600}}>Preview</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
   6. APPROVAL LIMITS MASTER
   ════════════════════════════════════════════════════════════════════ */


export const REVENUE_TREND_12M = [
  {month:"Jun-25", cy:18200000,ly:15800000},{month:"Jul-25", cy:22500000,ly:18200000},
  {month:"Aug-25", cy:25800000,ly:21400000},{month:"Sep-25", cy:21200000,ly:19500000},
  {month:"Oct-25", cy:26400000,ly:22800000},{month:"Nov-25", cy:24800000,ly:21200000},
  {month:"Dec-25", cy:31200000,ly:26500000},{month:"Jan-26", cy:19800000,ly:17200000},
  {month:"Feb-26", cy:22400000,ly:18900000},{month:"Mar-26", cy:28500000,ly:24200000},
  {month:"Apr-26", cy:24200000,ly:20800000},{month:"May-26", cy:26800000,ly:22500000},
];


export const BRANCH_PL_HEATMAP = (()=>{
  const months=["Jun-25","Jul-25","Aug-25","Sep-25","Oct-25","Nov-25","Dec-25","Jan-26","Feb-26","Mar-26","Apr-26","May-26"];
  const branches=["TKHO","BOM","AMD","NBO","DAR","FBM"];
  const baseRev={TKHO:0,BOM:8500000,AMD:3200000,NBO:5800000,DAR:2400000,FBM:1900000};
  const baseGP ={TKHO:0,BOM:1450000,AMD:580000, NBO:980000, DAR:420000, FBM:325000 };
  return branches.map(b=>({branch:b,
    cells:months.map((m,i)=>{
      const seasonal=1+0.15*Math.sin(i*Math.PI/6);
      const noise=0.85+Math.random()*0.3;
      return {month:m,rev:Math.round(baseRev[b]*seasonal*noise),gp:Math.round(baseGP[b]*seasonal*noise)};
    })}));
})();


export const TOP_CUSTOMERS_DATA = [
  {name:"L&T Limited",                   revenue:18500000,share:9.2,bookings:42,branch:"BOM"},
  {name:"Reliance Industries",           revenue:14200000,share:7.1,bookings:31,branch:"BOM"},
  {name:"TechCorp Solutions",            revenue:9800000, share:4.9,bookings:18,branch:"BOM"},
  {name:"Adventure Club India",          revenue:8500000, share:4.2,bookings:14,branch:"NBO"},
  {name:"Wildlife Photo Club",           revenue:7200000, share:3.6,bookings:9, branch:"DAR"},
  {name:"Greenfield School",             revenue:6800000, share:3.4,bookings:6, branch:"AMD"},
  {name:"Tata Consultancy Services",     revenue:6500000, share:3.2,bookings:22,branch:"BOM"},
  {name:"Infosys Limited",               revenue:5900000, share:2.9,bookings:19,branch:"BOM"},
  {name:"Sharma Enterprises",            revenue:5200000, share:2.6,bookings:24,branch:"BOM"},
  {name:"R.S. Mehta Family Trust",       revenue:4800000, share:2.4,bookings:11,branch:"BOM"},
];


export const TOP_SUPPLIERS_DATA = [
  {name:"Air India Ltd. (BSP)",          spend:42500000,share:18.2,vouchers:285,branch:"BOM"},
  {name:"Emirates Airlines (BSP)",       spend:28200000,share:12.1,vouchers:142,branch:"BOM"},
  {name:"Indigo Airlines",               spend:18500000,share:7.9, vouchers:198,branch:"BOM"},
  {name:"Dubai Wonders DMC",             spend:12400000,share:5.3, vouchers:48, branch:"BOM"},
  {name:"Kenya Safari Lodge Ltd.",       spend:9800000, share:4.2, vouchers:32, branch:"NBO"},
  {name:"Serengeti Camps Ltd.",          spend:7400000, share:3.2, vouchers:24, branch:"DAR"},
  {name:"Marriott Group (Bali)",         spend:6800000, share:2.9, vouchers:18, branch:"BOM"},
  {name:"VFS Global (Visa)",             spend:5200000, share:2.2, vouchers:412,branch:"BOM"},
  {name:"Hertz Car Rental",              spend:4500000, share:1.9, vouchers:84, branch:"BOM"},
  {name:"Bajaj Allianz Insurance",       spend:3800000, share:1.6, vouchers:215,branch:"BOM"},
];


export const PERIOD_CLOSE_DATA = [
  {branch:"TKHO", tbClosed:true,  reconciled:true,  approved:true,  status:"Closed"},
  {branch:"BOM",  tbClosed:true,  reconciled:true,  approved:false, status:"Awaiting Sr.FM"},
  {branch:"AMD",  tbClosed:true,  reconciled:false, approved:false, status:"Bank Reco Pending"},
  {branch:"NBO",  tbClosed:false, reconciled:false, approved:false, status:"In Progress"},
  {branch:"DAR",  tbClosed:false, reconciled:false, approved:false, status:"Not Started"},
  {branch:"FBM",  tbClosed:true,  reconciled:true,  approved:true,  status:"Closed"},
];


export const AR_AGEING_SUMMARY = [
  {bucket:"0-30 days",  amount:8420000,count:124,color:"#22c55e"},
  {bucket:"31-60 days", amount:3850000,count:48, color:"#eab308"},
  {bucket:"61-90 days", amount:1820000,count:24, color:"#f97316"},
  {bucket:">90 days",   amount:920000, count:14, color:"#A32D2D"},
];


export const AP_AGEING_SUMMARY = [
  {bucket:"0-30 days",  amount:6240000,count:184,color:"#22c55e"},
  {bucket:"31-60 days", amount:2150000,count:42, color:"#eab308"},
  {bucket:"61-90 days", amount:680000, count:18, color:"#f97316"},
  {bucket:">90 days",   amount:285000, count:9,  color:"#A32D2D"},
];


export const RECON_STATUS_DATA = [
  {bank:"HDFC TKHO Current",   matched:248, unmatched:3,  status:"Good"},
  {bank:"HDFC TKHO USD",       matched:42,  unmatched:1,  status:"Good"},
  {bank:"ICICI TKHO",          matched:128, unmatched:0,  status:"Clean"},
  {bank:"HDFC BOM Operational",matched:425, unmatched:8,  status:"Needs Review"},
  {bank:"HDFC AMD Operational",matched:185, unmatched:2,  status:"Good"},
  {bank:"KCB NBO",             matched:298, unmatched:12, status:"Behind"},
  {bank:"CRDB DAR",            matched:142, unmatched:5,  status:"Good"},
  {bank:"Rawbank FBM",         matched:78,  unmatched:1,  status:"Good"},
];


export const TODAY_VOUCHERS_BY_BR = {
  TKHO:{receipt:0,payment:8,journal:3,total:11,value:425000},
  BOM: {receipt:12,payment:18,journal:4,total:34,value:1850000},
  AMD: {receipt:4,payment:6,journal:1,total:11,value:485000},
  NBO: {receipt:7,payment:9,journal:2,total:18,value:680000},
  DAR: {receipt:3,payment:5,journal:1,total:9, value:285000},
  FBM: {receipt:2,payment:4,journal:0,total:6, value:185000},
};


export const RECENT_ACTIVITY_FEED = [
  {ts:"2026-05-20 11:42",branch:"BOM",action:"Posted Payment Voucher",amount:285000,vendor:"Air India BSP"},
  {ts:"2026-05-20 10:58",branch:"BOM",action:"Posted Tax Invoice",   amount:142500,vendor:"L&T Limited"},
  {ts:"2026-05-20 10:15",branch:"BOM",action:"Posted Receipt",       amount:485000,vendor:"Reliance Industries"},
  {ts:"2026-05-20 09:42",branch:"BOM",action:"Created new client",   amount:0,    vendor:"Adani Group"},
  {ts:"2026-05-19 17:30",branch:"BOM",action:"Posted Journal Voucher",amount:48500,vendor:"Bonus provision"},
];


export const VARIANCE_FLAGS_DATA = [
  {date:"2026-05-19",branch:"BOM",account:"Office Rent",budget:185000,actual:215000,variance:30000,pct:16.2},
  {date:"2026-05-18",branch:"NBO",account:"Office Supplies",budget:35000,actual:48500,variance:13500,pct:38.6},
  {date:"2026-05-17",branch:"DAR",account:"Vehicle Maintenance",budget:25000,actual:42000,variance:17000,pct:68.0},
];

/* ── Shared dashboard primitives ─────────────────────────────────── */


export const PERIOD_OPTIONS = ["Today","Week","Month","Quarter","YTD","Custom"];

export function PeriodSelector({period,setPeriod}){
  return (
    <div style={{display:"flex",gap:4,padding:3,background:"#f7f8fb",borderRadius:7,border:"1px solid #e1e3ec"}}>
      {PERIOD_OPTIONS.map(p=>(
        <button key={p} onClick={()=>setPeriod(p)}
          style={{padding:"5px 11px",border:"none",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",
            background:period===p?"#0d1326":"transparent",
            color:period===p?"#d4a437":"#5a6691"}}>{p}</button>
      ))}
    </div>
  );
}


export function DashboardHeader({title,subtitle,user,period,setPeriod,onExport}){
  return (
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:18,paddingBottom:14,borderBottom:"1px solid #e1e3ec"}}>
      <div>
        <h2 style={{margin:0,fontSize:22,color:"#0d1326",fontWeight:700}}>{title}</h2>
        <p style={{margin:"3px 0 0",fontSize:12.5,color:"#5a6691"}}>{subtitle} · <span style={{color:"#d4a437",fontWeight:600}}>{user.name}</span></p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <PeriodSelector period={period} setPeriod={setPeriod}/>
        <button onClick={onExport} style={{padding:"7px 12px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,cursor:"pointer",fontWeight:600,color:"#5a6691"}}>📄 Export PDF</button>
      </div>
    </div>
  );
}


export const cardStyle={background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,padding:14,position:"relative"};

export function DashboardRouter({branch,setRoute,currentUser}){
  const role = currentUser?.role || "Super Admin";
  if(role==="Director" || role==="Super Admin") return <DirectorDashboard currentUser={currentUser} setRoute={setRoute}/>;
  if(role==="Senior Finance Manager")          return <SrFmDashboard currentUser={currentUser} setRoute={setRoute}/>;
  if(role==="Sr. Accounts Executive")          return <SrAeDashboard currentUser={currentUser} setRoute={setRoute}/>;
  if(role==="Accounts Executive")              return <AcctsExecDashboard currentUser={currentUser} setRoute={setRoute} branch={branch}/>;
  if(role==="HR Manager")                      return <HrMgrDashboard currentUser={currentUser} setRoute={setRoute}/>;
  /* Fallback to existing branch dashboard */
  return <Dashboard branch={branch} setRoute={setRoute}/>;
}

/* ════════════════════════════════════════════════════════════════════
   16 NEW REPORTS — Financial · Profitability · HR · Compliance & Risk
   ════════════════════════════════════════════════════════════════════ */

/* ── Shared report-page wrapper ──────────────────────────────────── */


export const FS_NOTES = [
  {note:"1", title:"Corporate Information", body:"Travkings Tours & Travels Pvt. Ltd. is a private limited company incorporated in India under the Companies Act, 2013. Operating offices: TKHO (Head Office, Mumbai), 2 branches in India (BOM, AMD), 3 international branches (NBO Kenya, DAR Tanzania, FBM DRC)."},
  {note:"2", title:"Significant Accounting Policies", body:"Financial statements prepared under Indian GAAP / Ind AS, on accrual basis. Revenue recognised on travel completion or invoice date whichever is earlier. Forex transactions translated at transaction-date rates; closing balances at year-end rate."},
  {note:"3", title:"Cash and Bank Balances", autoSource:"BANK_ACCOUNTS_DATA", body:"Cash and bank balances at year-end across 9 accounts (Current: 7, USD: 1, Petty Cash: 1). Limits utilised: 18% on average."},
  {note:"4", title:"Trade Receivables", body:"Trade receivables as on 2026-05-20: ₹150.10L gross. Bucket ageing: 0-30d 56%, 31-60d 26%, 61-90d 12%, >90d 6%. Provision for doubtful debts: ₹85L (>90d × 50%)."},
  {note:"5", title:"Trade Payables", body:"Trade payables ₹93.55L gross. Avg DPO 38 days. MSME suppliers identified: 4 vendors (TDS u/s 43B(h) applicable for FY 2025-26)."},
  {note:"6", title:"Revenue from Operations", autoSource:"FY_TARGETS_DATA", body:"Revenue for FY 2025-26: ₹24.85 Cr (vs target ₹28.00 Cr, 88.7% achieved). Product mix: Flight 42%, Holiday 18%, Hotel 15%, Visa 11%, Insurance 6%, Misc 8%."},
  {note:"7", title:"Employee Benefit Expenses", body:"8 employees on permanent rolls. Total salary outflow ₹95.40L for FY. PF and ESI contributions ₹11.20L. Gratuity provision actuarially determined ₹3.85L."},
  {note:"8", title:"Foreign Currency Transactions", body:"Forex purchases: USD 245K, EUR 88K, AED 320K during FY. Forex sales: USD 198K, EUR 72K, AED 245K. Net exposure unhedged: USD 47K, EUR 16K, AED 75K."},
  {note:"9", title:"Related Party Transactions", body:"Director remuneration ₹84L (Afshin Dhanani). Inter-branch transactions: ₹82.25L (eliminated in consolidation)."},
  {note:"10",title:"Contingent Liabilities", body:"Bank guarantees outstanding: ₹15L (IATA/BSP security). No income tax demands disputed. No GST notices pending."},
  {note:"11",title:"Segment Information", body:"Primary segments: Geography (India 71%, East Africa 22%, Central Africa 7%). Secondary: Product type (Flight 42%, others 58%)."},
  {note:"12",title:"Earnings Per Share", body:"Basic EPS: ₹16.80 (Net profit ₹1.68 Cr / 10L shares of ₹10 each). Diluted EPS: same (no dilutive instruments)."},
];


export const AUDIT_TRAIL_DATA = [
  {ts:"2026-05-20 11:42",user:"Rohan",         branch:"BOM", action:"CREATE",module:"Payment Voucher",desc:"Posted PV-BOM/2026/0892 for ₹2,85,000 (Air India BSP)",ip:"103.21.45.18"},
  {ts:"2026-05-20 11:30",user:"Faiz Patel",    branch:"TKHO",action:"APPROVE",module:"Approval Queue",desc:"Approved PV-BOM/2026/0892 (Air India BSP, ₹2.85L)",ip:"103.21.45.22"},
  {ts:"2026-05-20 10:58",user:"Rohan",         branch:"BOM", action:"CREATE",module:"Tax Invoice",   desc:"Created INV-BOM/2026/8742 for L&T Limited, ₹1,42,500",ip:"103.21.45.18"},
  {ts:"2026-05-20 10:15",user:"Rohan",         branch:"BOM", action:"CREATE",module:"Receipt Voucher",desc:"Posted RV-BOM/2026/4521 for Reliance Industries ₹4,85,000",ip:"103.21.45.18"},
  {ts:"2026-05-20 09:42",user:"Rohan",         branch:"BOM", action:"CREATE",module:"Master",         desc:"Created new client master: Adani Group (GSTIN: 24AAACA0123F1ZK)",ip:"103.21.45.18"},
  {ts:"2026-05-19 17:30",user:"Rohan",         branch:"BOM", action:"CREATE",module:"Journal Voucher",desc:"Posted JV-BOM/2026/0198 — Bonus provision ₹48,500",ip:"103.21.45.18"},
  {ts:"2026-05-19 16:45",user:"Sughra Sayed",  branch:"TKHO",action:"APPROVE",module:"Approval Queue",desc:"Approved JV-BOM/2026/0198 (Bonus provision)",ip:"103.21.45.22"},
  {ts:"2026-05-19 15:20",user:"Mohan",         branch:"AMD", action:"EDIT",  module:"Master",         desc:"Updated supplier bank A/c: Emirates GS (req. approval)",ip:"49.207.18.42"},
  {ts:"2026-05-19 14:08",user:"Faiz Patel",    branch:"TKHO",action:"APPROVE",module:"Master",        desc:"Approved supplier bank A/c change: Emirates GS",ip:"103.21.45.22"},
  {ts:"2026-05-19 11:55",user:"Mujeet",        branch:"NBO", action:"CREATE",module:"Payment Voucher",desc:"Posted PV-NBO/2026/0651 — Kenya Safari Lodge KES 1,82,500",ip:"196.207.45.18"},
  {ts:"2026-05-19 09:14",user:"AD",            branch:"TKHO",action:"LOGIN", module:"Auth",           desc:"Login session started",ip:"103.21.45.30"},
  {ts:"2026-05-18 18:30",user:"Faiz Patel",    branch:"TKHO",action:"DELETE",module:"Master",         desc:"Marked customer inactive: ABC Tours (no activity 18m)",ip:"103.21.45.22"},
];


export const CUSTOMER_LTV_DATA = [
  {name:"L&T Limited",            firstBooking:"2019-03-15",lastBooking:"2026-05-18",totalBookings:284,ltv:148500000,avgBasket:522887,monthsActive:86, recencyDays:2 },
  {name:"Reliance Industries",    firstBooking:"2020-06-10",lastBooking:"2026-05-15",totalBookings:198,ltv:96500000, avgBasket:487374,monthsActive:71, recencyDays:5 },
  {name:"TechCorp Solutions",     firstBooking:"2021-09-20",lastBooking:"2026-05-12",totalBookings:118,ltv:48200000, avgBasket:408475,monthsActive:56, recencyDays:8 },
  {name:"Adventure Club India",   firstBooking:"2018-04-12",lastBooking:"2026-04-22",totalBookings:96, ltv:62500000, avgBasket:651042,monthsActive:97, recencyDays:28},
  {name:"Wildlife Photo Club",    firstBooking:"2019-08-05",lastBooking:"2026-03-10",totalBookings:54, ltv:38200000, avgBasket:707407,monthsActive:81, recencyDays:71},
  {name:"Greenfield School",      firstBooking:"2021-04-20",lastBooking:"2026-05-08",totalBookings:24, ltv:18500000, avgBasket:770833,monthsActive:61, recencyDays:12},
  {name:"Tata Consultancy Services",firstBooking:"2022-01-15",lastBooking:"2026-05-19",totalBookings:142,ltv:42500000, avgBasket:299296,monthsActive:40, recencyDays:1 },
  {name:"Infosys Limited",        firstBooking:"2022-07-10",lastBooking:"2026-05-16",totalBookings:118,ltv:38500000, avgBasket:326271,monthsActive:34, recencyDays:4 },
  {name:"Sharma Enterprises",     firstBooking:"2017-11-22",lastBooking:"2026-05-14",totalBookings:218,ltv:48200000, avgBasket:221101,monthsActive:102,recencyDays:6 },
  {name:"R.S. Mehta Family Trust",firstBooking:"2018-06-15",lastBooking:"2025-12-20",totalBookings:48, ltv:24500000, avgBasket:510417,monthsActive:90, recencyDays:151},
];

/* ABC analysis derived from TOP_CUSTOMERS_DATA in dashboards */

export function abcOf(items, valueKey){
  const sorted=[...items].sort((a,b)=>b[valueKey]-a[valueKey]);
  const total=sorted.reduce((s,x)=>s+x[valueKey],0);
  let cum=0;
  return sorted.map(x=>{
    cum+=x[valueKey];
    const cumPct=cum/total*100;
    let cls="C";
    if(cumPct<=80) cls="A";
    else if(cumPct<=95) cls="B";
    return {...x,cumPct:cumPct.toFixed(1),class:cls,share:(x[valueKey]/total*100).toFixed(2)};
  });
}


export const ATTRITION_DATA = [
  {month:"Jun-25",joiners:0,leavers:0,openingHc:6,closingHc:6,attritionRate:0},
  {month:"Jul-25",joiners:0,leavers:0,openingHc:6,closingHc:6,attritionRate:0},
  {month:"Aug-25",joiners:1,leavers:0,openingHc:6,closingHc:7,attritionRate:0},
  {month:"Sep-25",joiners:0,leavers:0,openingHc:7,closingHc:7,attritionRate:0},
  {month:"Oct-25",joiners:0,leavers:1,openingHc:7,closingHc:6,attritionRate:14.3},
  {month:"Nov-25",joiners:1,leavers:0,openingHc:6,closingHc:7,attritionRate:0},
  {month:"Dec-25",joiners:0,leavers:0,openingHc:7,closingHc:7,attritionRate:0},
  {month:"Jan-26",joiners:0,leavers:0,openingHc:7,closingHc:7,attritionRate:0},
  {month:"Feb-26",joiners:0,leavers:1,openingHc:7,closingHc:6,attritionRate:14.3},
  {month:"Mar-26",joiners:1,leavers:0,openingHc:6,closingHc:7,attritionRate:0},
  {month:"Apr-26",joiners:1,leavers:0,openingHc:7,closingHc:8,attritionRate:0},
  {month:"May-26",joiners:0,leavers:0,openingHc:8,closingHc:8,attritionRate:0},
];


export const STATUTORY_DUES = [
  {due:"2026-05-20",authority:"GST",     filing:"GSTR-3B — April 26",       entity:"All India entities",amount:485000,status:"Pending",  daysLeft:0},
  {due:"2026-05-20",authority:"GST",     filing:"GSTR-1 — April 26",        entity:"All India entities",amount:0,     status:"Filed",    daysLeft:0},
  {due:"2026-05-30",authority:"TDS",     filing:"TDS Q4 Return (24Q+26Q)",  entity:"All India entities",amount:0,     status:"Pending",  daysLeft:10},
  {due:"2026-05-31",authority:"PF",      filing:"PF Challan April 26",      entity:"All India entities",amount:42500, status:"Pending",  daysLeft:11},
  {due:"2026-05-31",authority:"ESI",     filing:"ESI Challan April 26",     entity:"All India entities",amount:18200, status:"Pending",  daysLeft:11},
  {due:"2026-06-07",authority:"TDS",     filing:"TDS May payment",          entity:"All India entities",amount:485000,status:"Upcoming", daysLeft:18},
  {due:"2026-06-15",authority:"Income Tax",filing:"Advance Tax Q1 (15%)",   entity:"Travkings P Ltd",   amount:1850000,status:"Upcoming",daysLeft:26},
  {due:"2026-06-20",authority:"GST",     filing:"GSTR-3B — May 26",         entity:"All India entities",amount:0,     status:"Upcoming", daysLeft:31},
  {due:"2026-07-20",authority:"KRA",     filing:"VAT Return May 26",        entity:"Travkings NBO",     amount:148000,status:"Upcoming", daysLeft:61},
  {due:"2026-07-31",authority:"TRA",     filing:"VAT Return May 26",        entity:"Travkings DAR",     amount:185000,status:"Upcoming", daysLeft:72},
  {due:"2026-09-30",authority:"MCA",     filing:"AOC-4 (Annual Filing)",    entity:"Travkings P Ltd",   amount:5000,  status:"Upcoming", daysLeft:133},
  {due:"2026-10-31",authority:"Income Tax",filing:"Tax Audit Report (3CD)", entity:"Travkings P Ltd",   amount:0,     status:"Upcoming", daysLeft:164},
];


export const FX_EXPOSURE = [
  {currency:"USD",receivables:4850000,payables:2240000,cashHeld:4101300,netExposure:6711300,hedged:2500000,unhedged:4211300,unhedgedINR:355884875},
  {currency:"EUR",receivables:1450000,payables:880000, cashHeld:0,      netExposure:570000,  hedged:0,      unhedged:570000,  unhedgedINR:51987600},
  {currency:"AED",receivables:2800000,payables:1450000,cashHeld:0,      netExposure:1350000, hedged:500000, unhedged:850000,  unhedgedINR:19567000},
  {currency:"KES",receivables:8500000,payables:4200000,cashHeld:3450000,netExposure:7750000, hedged:0,      unhedged:7750000, unhedgedINR:5050750},
  {currency:"TZS",receivables:12500000,payables:6800000,cashHeld:18500000,netExposure:24200000,hedged:0,    unhedged:24200000,unhedgedINR:822800},
  {currency:"CDF",receivables:8500000,payables:4500000,cashHeld:0,      netExposure:4000000, hedged:0,      unhedged:4000000, unhedgedINR:120000},
];

/* ════════════════════════════════════════════════════════════════════
   FINANCIAL REPORTS (4)
   ════════════════════════════════════════════════════════════════════ */

/* 1. Cash Position Summary */

export const TAB_Page = (title, subtitle, audit, children) => (
  <div style={{padding:18,maxWidth:1400,margin:"0 auto"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #e1e3ec"}}>
      <div>
        <h2 style={{margin:0,fontSize:20,color:"#0d1326",fontWeight:700}}>{title}</h2>
        <p style={{margin:"3px 0 0",fontSize:12,color:"#5a6691"}}>{subtitle}</p>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #e1e3ec",borderRadius:6,fontSize:11.5,fontWeight:600,color:"#5a6691",cursor:"pointer"}}>← Back</button>
        <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #d4a437",borderRadius:6,fontSize:11.5,fontWeight:600,color:"#d4a437",cursor:"pointer"}}>📋 Duplicate</button>
        <button style={{padding:"7px 14px",background:"#d4a437",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,color:"#0d1326",cursor:"pointer"}}>💾 Save</button>
      </div>
    </div>
    {children}
    {audit&&<div style={{padding:"10px 18px",marginTop:14,background:"#fafbfd",border:"1px solid #e1e3ec",borderRadius:6,fontSize:10.5,color:"#5a6691",textAlign:"center"}}>
      Last modified by <b style={{color:"#0d1326"}}>{audit.user}</b> on <b style={{color:"#0d1326"}}>{audit.date}</b> · Record created on <b style={{color:"#0d1326"}}>{audit.created}</b>
    </div>}
  </div>
);


export const tabPanel = (children) => <div style={{padding:18,minHeight:380}}>{children}</div>;
/* FL helper defined as function at top of file */

export const INVESTMENT_DATA = [
  {id:"INV-001",type:"FD",institution:"HDFC Bank",branch:"TKHO",amount:2500000,rate:7.50,startDate:"2026-01-15",maturityDate:"2027-01-15",tenure:"12M",maturityValue:2687500,status:"Active",autoRenew:true},
  {id:"INV-002",type:"FD",institution:"ICICI Bank",branch:"TKHO",amount:1000000,rate:7.25,startDate:"2025-10-01",maturityDate:"2026-10-01",tenure:"12M",maturityValue:1072500,status:"Active",autoRenew:false},
  {id:"INV-003",type:"FD",institution:"HDFC Bank",branch:"BOM",  amount:500000, rate:7.10,startDate:"2026-04-01",maturityDate:"2026-07-01",tenure:"3M", maturityValue:508875, status:"Active",autoRenew:false},
  {id:"INV-004",type:"FD",institution:"SBI",        branch:"AMD",  amount:750000, rate:6.80,startDate:"2025-12-15",maturityDate:"2026-06-15",tenure:"6M", maturityValue:775500, status:"Active",autoRenew:true},
  {id:"INV-005",type:"MF", institution:"HDFC Mutual Fund",branch:"TKHO",amount:1500000,rate:12.40,startDate:"2025-07-01",maturityDate:"—",tenure:"Open",maturityValue:1686000,status:"Active",autoRenew:false},
  {id:"INV-006",type:"MF", institution:"Nippon India MF",branch:"TKHO",amount:800000, rate:11.80,startDate:"2025-07-01",maturityDate:"—",tenure:"Open",maturityValue:894400, status:"Active",autoRenew:false},
  {id:"INV-007",type:"GOI",institution:"RBI Retail Direct",branch:"TKHO",amount:2000000,rate:7.32,startDate:"2024-09-01",maturityDate:"2031-09-01",tenure:"7Y",maturityValue:3076400,status:"Active",autoRenew:false},
  {id:"INV-008",type:"FD",institution:"HDFC Bank",branch:"TKHO",amount:1200000,rate:7.10,startDate:"2025-04-01",maturityDate:"2026-04-01",tenure:"12M",maturityValue:1285200,status:"Matured",autoRenew:true},
];


export const RECO_QUEUE_DATA = [
  {id:"BT-001",date:"2026-05-20",bank:"HDFC BOM Current",desc:"NEFT credit from L&T Limited",amount:485000,type:"credit",matchStatus:"auto_matched",matchedVoucher:"RV-BOM/2026/4521",confidence:98},
  {id:"BT-002",date:"2026-05-20",bank:"HDFC BOM Current",desc:"NEFT debit to Air India BSP",amount:285000,type:"debit",matchStatus:"auto_matched",matchedVoucher:"PV-BOM/2026/0892",confidence:100},
  {id:"BT-003",date:"2026-05-19",bank:"HDFC BOM Current",desc:"UPI credit — Sharma Enterprises",amount:142500,type:"credit",matchStatus:"pending",matchedVoucher:null,confidence:0},
  {id:"BT-004",date:"2026-05-19",bank:"HDFC BOM Current",desc:"IMPS credit — unknown sender",amount:50000,type:"credit",matchStatus:"pending",matchedVoucher:null,confidence:0},
  {id:"BT-005",date:"2026-05-18",bank:"HDFC BOM Current",desc:"NEFT debit — HDFC Home Loans",amount:125000,type:"debit",matchStatus:"partial",matchedVoucher:"PV-BOM/2026/0881",confidence:72},
  {id:"BT-006",date:"2026-05-18",bank:"ICICI TKHO Current",desc:"NEFT credit — Reliance Industries",amount:950000,type:"credit",matchStatus:"pending",matchedVoucher:null,confidence:0},
  {id:"BT-007",date:"2026-05-17",bank:"KCB NBO Current",desc:"M-Pesa receipt — Adventure Club",amount:8500,type:"credit",matchStatus:"pending",matchedVoucher:null,confidence:0},
  {id:"BT-008",date:"2026-05-17",bank:"HDFC BOM Current",desc:"NACH debit — office rent May",amount:185000,type:"debit",matchStatus:"auto_matched",matchedVoucher:"PV-BOM/2026/0879",confidence:95},
  {id:"BT-009",date:"2026-05-16",bank:"HDFC AMD Current",desc:"NEFT credit — Greenfield School adv",amount:680000,type:"credit",matchStatus:"partial",matchedVoucher:"RV-AMD/2026/1540",confidence:65},
  {id:"BT-010",date:"2026-05-16",bank:"HDFC BOM Current",desc:"Bank charges — May statement",amount:1250,type:"debit",matchStatus:"pending",matchedVoucher:null,confidence:0},
];


export const SAVED_VIEWS_DATA = [
  {id:"SV-001",name:"Monthly P&L by Branch",type:"Profitability",fields:["Branch","Revenue","Cost","GP","GP%"],filters:["Period = Current Month","Branch = All"],owner:"Faiz Patel",lastRun:"2026-05-20 09:12",scheduled:true,schedFreq:"Monthly",icon:"📈"},
  {id:"SV-002",name:"Weekly Cash Position",type:"Financial",fields:["Bank","Currency","Balance","INR Equiv","Limit%"],filters:["Status = Active"],owner:"Faiz Patel",lastRun:"2026-05-19 08:00",scheduled:true,schedFreq:"Weekly",icon:"🏦"},
  {id:"SV-003",name:"Top 20 Customers YTD",type:"Profitability",fields:["Customer","Revenue","GP","GP%","Bookings"],filters:["Period = YTD","Sort = Revenue DESC","Limit = 20"],owner:"Afshin Dhanani",lastRun:"2026-05-01 10:00",scheduled:false,schedFreq:null,icon:"👥"},
  {id:"SV-004",name:"Overdue Payables > 30d",type:"Financial",fields:["Supplier","Invoice","DueDate","Amount","DaysOverdue"],filters:["DaysOverdue > 30","Status = Unpaid"],owner:"Sughra Sayed",lastRun:"2026-05-20 10:30",scheduled:true,schedFreq:"Daily",icon:"⚠️"},
  {id:"SV-005",name:"Branch Revenue Comparison",type:"Operational",fields:["Branch","MTD Revenue","LTM Revenue","YoY%","Bookings"],filters:["Period = MTD"],owner:"Afshin Dhanani",lastRun:"2026-05-19 17:00",scheduled:false,schedFreq:null,icon:"🔀"},
  {id:"SV-006",name:"TDS Deduction Register",type:"Compliance",fields:["Vendor","Section","Gross","TDS","Net","Month"],filters:["Period = Current Quarter"],owner:"Rohan",lastRun:"2026-05-15 11:00",scheduled:true,schedFreq:"Monthly",icon:"📋"},
];


export const SCHEDULED_REPORTS_DATA = [
  {id:"SCH-001",report:"Monthly P&L by Branch",freq:"Monthly",day:"1st of month",time:"07:00",recipients:["afshin@travkings.com","faiz.fm@travkings.com"],lastSent:"2026-05-01 07:02",nextRun:"2026-06-01 07:00",format:"PDF",status:"Active"},
  {id:"SCH-002",report:"Weekly Cash Position",freq:"Weekly",day:"Monday",time:"08:00",recipients:["faiz.fm@travkings.com","sughra.sae@travkings.com"],lastSent:"2026-05-19 08:01",nextRun:"2026-05-26 08:00",format:"Excel",status:"Active"},
  {id:"SCH-003",report:"Daily Voucher Summary",freq:"Daily",day:"Every day",time:"19:00",recipients:["sughra.sae@travkings.com"],lastSent:"2026-05-19 19:00",nextRun:"2026-05-20 19:00",format:"PDF",status:"Active"},
  {id:"SCH-004",report:"Overdue Payables > 30d",freq:"Daily",day:"Every day",time:"09:00",recipients:["faiz.fm@travkings.com","sughra.sae@travkings.com"],lastSent:"2026-05-20 09:00",nextRun:"2026-05-21 09:00",format:"Excel",status:"Active"},
  {id:"SCH-005",report:"TDS Deduction Register",freq:"Monthly",day:"7th of month",time:"10:00",recipients:["faiz.fm@travkings.com"],lastSent:"2026-05-07 10:01",nextRun:"2026-06-07 10:00",format:"Excel",status:"Paused"},
  {id:"SCH-006",report:"GSTR Filing Reminder",freq:"Monthly",day:"18th of month",time:"09:00",recipients:["afshin@travkings.com","faiz.fm@travkings.com","sughra.sae@travkings.com"],lastSent:"2026-05-18 09:00",nextRun:"2026-06-18 09:00",format:"PDF",status:"Active"},
];


export const BUILDER_FIELD_CATALOG = {
  "Date & Period":["Invoice Date","Booking Date","Payment Date","Due Date","Period (Month)","Period (Quarter)","Financial Year"],
  "Party":["Customer Name","Supplier Name","Branch","Sub-Agent","Consultant","Country","City"],
  "Amount":["Revenue","Cost","Gross Profit","GP %","TDS Amount","Tax Amount","Net Amount","Advance","Outstanding"],
  "Status":["Payment Status","Approval Status","Filing Status","Voucher Type","Category"],
  "Reference":["Voucher No.","Invoice No.","PNR","Booking Ref","Project Code","Cost Center"],
};


export const DEMO_REPORT_DATA = [
  {branch:"BOM",cy_rev:38500000,ly_rev:32400000,cy_gp:6850000,ly_gp:5508000,sparkline:[32.4,34.1,35.2,33.8,36.1,38.5]},
  {branch:"AMD",cy_rev:14200000,ly_rev:11800000,cy_gp:2480000,ly_gp:2006000,sparkline:[11.8,12.4,12.1,13.2,13.8,14.2]},
  {branch:"NBO",cy_rev:18500000,ly_rev:16200000,cy_gp:4200000,ly_gp:3564000,sparkline:[16.2,16.8,17.4,16.9,17.8,18.5]},
  {branch:"DAR",cy_rev:9800000, ly_rev:8400000, cy_gp:2680000,ly_gp:2184000,sparkline:[8.4,8.8,9.1,8.9,9.4,9.8]},
  {branch:"FBM",cy_rev:6400000, ly_rev:5200000, cy_gp:1850000,ly_gp:1456000,sparkline:[5.2,5.6,5.8,6.0,6.2,6.4]},
  {branch:"TKHO",cy_rev:0,      ly_rev:0,       cy_gp:0,      ly_gp:0,      sparkline:[0,0,0,0,0,0]},
];

/* ── Sparkline SVG component ─────────────────────────────────────── */

export function Sparkline({values,color="#d4a437",w=80,h=28}){
  if(!values||values.length<2) return <span style={{color:"#5a6691",fontSize:10}}>—</span>;
  const max=Math.max(...values)||1;
  const min=Math.min(...values);
  const range=max-min||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1))*(w-4)+2},${h-2-((v-min)/range)*(h-4)}`).join(" ");
  return(
    <svg width={w} height={h} style={{display:"block",overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round"/>
      {values.map((v,i)=>i===values.length-1?(
        <circle key={i} cx={(i/(values.length-1))*(w-4)+2} cy={h-2-((v-min)/range)*(h-4)} r={2.5} fill={color}/>
      ):null)}
    </svg>
  );
}

/* ── Drill-down modal ────────────────────────────────────────────── */

export function DrillModal({branch,metric,value,onClose}){
  const rows=[
    {vno:"INV-"+branch+"/2026/8740",date:"2026-05-18",party:"L&T Limited",   amount:Math.round(value*0.28)},
    {vno:"INV-"+branch+"/2026/8728",date:"2026-05-12",party:"Reliance Ind.", amount:Math.round(value*0.22)},
    {vno:"INV-"+branch+"/2026/8715",date:"2026-05-08",party:"TechCorp Sol.", amount:Math.round(value*0.18)},
    {vno:"INV-"+branch+"/2026/8701",date:"2026-05-04",party:"Infosys Ltd.",  amount:Math.round(value*0.14)},
    {vno:"INV-"+branch+"/2026/8695",date:"2026-05-02",party:"Others (48)",   amount:Math.round(value*0.18)},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,19,38,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:10,padding:22,width:580,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <p style={{margin:0,fontSize:14,fontWeight:700,color:"#0d1326"}}>Drill-down: {branch} — {metric}</p>
            <p style={{margin:"2px 0 0",fontSize:11.5,color:"#5a6691"}}>Total: <b style={{color:"#d4a437"}}>{fmtINR(value)}</b> · May 2026 · click any row to open voucher</p>
          </div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",border:"1px solid #e1e3ec",background:"#f7f8fb",cursor:"pointer",fontSize:14,fontWeight:700,color:"#5a6691"}}>✕</button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#f7f8fb"}}><th style={RPT_thStyle}>Voucher</th><th style={RPT_thStyle}>Date</th><th style={RPT_thStyle}>Party</th><th style={{...RPT_thStyle,textAlign:"right"}}>Amount</th></tr></thead>
          <tbody>{rows.map((r,i)=>(
            <tr key={i} style={{borderBottom:"1px solid #f0f2f7",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fff8e8"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{...RPT_tdStyle,fontFamily:"monospace",fontSize:10.5,color:"#d4a437",fontWeight:600}}>{r.vno}</td>
              <td style={RPT_tdStyle}>{r.date}</td>
              <td style={{...RPT_tdStyle,fontWeight:600}}>{r.party}</td>
              <td style={{...RPT_tdStyle,textAlign:"right",fontWeight:700}}>{fmtINR(r.amount)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{marginTop:12,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button style={{padding:"7px 14px",background:"#fff",border:"1px solid #e1e3ec",color:"#5a6691",borderRadius:6,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>📊 Full Report</button>
          <button onClick={onClose} style={{padding:"7px 14px",background:"#d4a437",color:"#0d1326",border:"none",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Export dropdown ─────────────────────────────────────────────── */

export function ExportDropdown(){
  const [open,setOpen]=useState(false);
  const formats=[
    {fmt:"PDF",icon:"📄",desc:"Formatted printable report"},
    {fmt:"Excel (.xlsx)",icon:"📊",desc:"Full data with formulas"},
    {fmt:"CSV",icon:"📋",desc:"Flat data for analysis"},
    {fmt:"JSON",icon:"{ }",desc:"Machine-readable"},
    {fmt:"HTML",icon:"🌐",desc:"Email-embeddable"},
  ];
  return(
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(!open)} style={{padding:"7px 14px",background:"#0d1326",color:"#d4a437",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        📤 Export ▾
      </button>
      {open&&(
        <div style={{position:"absolute",top:"110%",right:0,background:"#fff",border:"1px solid #e1e3ec",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",width:220,zIndex:100}} onMouseLeave={()=>setOpen(false)}>
          <p style={{margin:0,padding:"8px 14px",fontSize:10.5,color:"#5a6691",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",borderBottom:"1px solid #e1e3ec"}}>Export as</p>
          {formats.map(f=>(
            <button key={f.fmt} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:"transparent",border:"none",width:"100%",textAlign:"left",cursor:"pointer",fontSize:12}} onMouseEnter={e=>e.currentTarget.style.background="#f7f8fb"} onMouseLeave={e=>e.currentTarget.style.background=""} onClick={()=>setOpen(false)}>
              <span style={{fontSize:16,width:22}}>{f.icon}</span>
              <div><p style={{margin:0,fontWeight:700,color:"#0d1326"}}>{f.fmt}</p><p style={{margin:0,fontSize:10,color:"#5a6691"}}>{f.desc}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   1. CUSTOM REPORT BUILDER
   ════════════════════════════════════════════════════════════════════ */

export const MY_PAYSLIP_DATA = {
  employee:"Rohan", empId:"TK-BOM-003", branch:"BOM",
  month:"April 2026", dept:"Accounts",
  earnings:[
    {desc:"Basic Salary",         amount:28000},
    {desc:"House Rent Allowance", amount:11200},
    {desc:"Transport Allowance",  amount:1600},
    {desc:"Special Allowance",    amount:4200},
    {desc:"Performance Bonus",    amount:3500},
  ],
  deductions:[
    {desc:"Provident Fund (12%)", amount:3360},
    {desc:"Professional Tax",     amount:200},
    {desc:"Income Tax (TDS)",     amount:1850},
    {desc:"ESI",                  amount:742},
  ],
};


export const INVESTMENT_SECTIONS = [
  {section:"80C",limit:150000,label:"80C — PPF, ELSS, LIC, EPF, Home Loan Principal",declared:120000,proof:"PPF passbook, LIC receipt"},
  {section:"80D",limit:25000, label:"80D — Health Insurance Premium",               declared:18000, proof:"Insurance premium receipt"},
  {section:"80E",limit:0,     label:"80E — Education Loan Interest",                declared:0,     proof:"Bank statement"},
  {section:"80G",limit:0,     label:"80G — Donations",                              declared:5000,  proof:"Donation receipt 80G cert"},
  {section:"HRA",limit:0,     label:"HRA Exemption",                                declared:89600, proof:"Rent receipts, landlord PAN"},
  {section:"LTA",limit:0,     label:"LTA — Leave Travel Allowance",                 declared:12000, proof:"Travel tickets"},
];


export const PERFORMANCE_REVIEWS = [
  {period:"FY 2024-25",reviewer:"Faiz Patel",score:78,grade:"B+",kpis:[{kpi:"Voucher Accuracy",target:99,actual:99.2,score:100},{kpi:"Month-end Close Timeliness",target:"5th",actual:"4th",score:100},{kpi:"Pending Items Resolution",target:"<5",actual:3,score:90},{kpi:"Training Completion",target:"100%",actual:"80%",score:80}],comments:"Strong performer. Needs to complete pending GST training.",status:"Finalized"},
];


export const SKILLS_DATA = [
  {skill:"Tally ERP",           category:"Accounting",   level:4,target:4,lastAssessed:"2025-12-01"},
  {skill:"GST Return Filing",   category:"Taxation",     level:3,target:5,lastAssessed:"2025-12-01"},
  {skill:"Bank Reconciliation", category:"Accounting",   level:5,target:5,lastAssessed:"2025-12-01"},
  {skill:"Microsoft Excel",     category:"Tools",        level:4,target:5,lastAssessed:"2025-12-01"},
  {skill:"TDS Calculations",    category:"Taxation",     level:3,target:4,lastAssessed:"2025-12-01"},
  {skill:"Financial Reporting", category:"Finance",      level:3,target:4,lastAssessed:"2025-12-01"},
  {skill:"Customer Comm.",      category:"Soft Skills",  level:4,target:4,lastAssessed:"2025-12-01"},
  {skill:"Time Management",     category:"Soft Skills",  level:3,target:4,lastAssessed:"2025-12-01"},
];


export const FEEDBACK_360_DATA = [
  {from:"Faiz Patel",    role:"Manager",   relation:"Manager",    submitted:true,  score:82},
  {from:"Sughra Sayed",  role:"Sr. AE",    relation:"Senior",     submitted:true,  score:79},
  {from:"Mohan",         role:"Accts Exec",relation:"Peer",       submitted:true,  score:85},
  {from:"Mujeet",        role:"Accts Exec",relation:"Peer",       submitted:false, score:null},
  {from:"Self",          role:"—",         relation:"Self",       submitted:true,  score:75},
];


export const MY_CLAIMS_DATA = [
  {id:"EXP-BOM-001",date:"2026-05-14",category:"Stationery",   desc:"Printer cartridges and A4 paper",    amount:880,  receipt:"Yes",status:"Approved", paid:"2026-05-16"},
  {id:"EXP-BOM-002",date:"2026-04-28",category:"Travel",       desc:"Local taxi to client site (L&T)",    amount:450,  receipt:"Yes",status:"Paid",     paid:"2026-04-30"},
  {id:"EXP-BOM-003",date:"2026-04-20",category:"Meals",        desc:"Team lunch — reconciliation session",amount:1240, receipt:"Yes",status:"Pending",  paid:"—"},
  {id:"EXP-BOM-004",date:"2026-03-30",category:"Internet",     desc:"Hotspot charges March",               amount:399,  receipt:"Yes",status:"Paid",     paid:"2026-04-05"},
];

/* ════════════════════════════════════════════════════════════════════
   1. EMPLOYEE SELF-SERVICE PORTAL (hub)
   ════════════════════════════════════════════════════════════════════ */

export const FORM16A_DATA = [
  {vendor:"Air India Ltd. (BSP)",pan:"AAACA1234D1ZA",section:"194C",quarter:"Q4 FY25-26",gross:4250000,tds:42500,net:4207500,paid:true,certNo:"FORM16A/BOM/2526/Q4/001"},
  {vendor:"Dubai Wonders DMC",   pan:"AAACB5678E1ZB",section:"194C",quarter:"Q4 FY25-26",gross:1240000,tds:12400,net:1227600,paid:true,certNo:"FORM16A/BOM/2526/Q4/002"},
  {vendor:"VFS Global (Visa)",   pan:"AAACV9012F1ZC",section:"194J",quarter:"Q4 FY25-26",gross:520000, tds:52000, net:468000, paid:true,certNo:"FORM16A/BOM/2526/Q4/003"},
  {vendor:"Hertz Car Rental",    pan:"AAACH3456G1ZD",section:"194C",quarter:"Q4 FY25-26",gross:450000, tds:4500,  net:445500, paid:true,certNo:"FORM16A/BOM/2526/Q4/004"},
  {vendor:"Marriott Group (Bali)",pan:"AAACM7890H1ZE",section:"194C",quarter:"Q4 FY25-26",gross:680000, tds:6800,  net:673200, paid:false,certNo:"FORM16A/BOM/2526/Q4/005"},
];


export const EMAIL_TEMPLATES_DATA = [
  {id:"ET-001",name:"Booking Confirmation",trigger:"On booking creation",channel:"Email",subject:"Your booking is confirmed — {BookingRef}",body:"Dear {CustomerName},\n\nThank you for booking with Travkings. Your booking reference is {BookingRef}.\n\nTrip: {TripName}\nDates: {DepartureDate} — {ReturnDate}\nPassengers: {PaxCount}\n\nPlease find your detailed itinerary attached.\n\nRegards,\n{ConsultantName}\nTravkings Tours & Travels",active:true},
  {id:"ET-002",name:"Payment Receipt",trigger:"On receipt voucher posting",channel:"Email",subject:"Payment received — {VoucherNo}",body:"Dear {CustomerName},\n\nWe acknowledge receipt of ₹{Amount} on {Date}. Voucher: {VoucherNo}.\n\nThank you.\nTravkings Accounts Team",active:true},
  {id:"ET-003",name:"Invoice Reminder",trigger:"7 days before due date",channel:"Email",subject:"Reminder: Invoice {InvoiceNo} due on {DueDate}",body:"Dear {CustomerName},\n\nThis is a friendly reminder that invoice {InvoiceNo} for ₹{Amount} is due on {DueDate}.\n\nKindly arrange payment at the earliest.\n\nRegards,\nTravkings Accounts",active:true},
  {id:"ET-004",name:"Visa Status Update (SMS)",trigger:"On visa approval",channel:"SMS",subject:"",body:"Travkings: Visa for {PassengerName} ({Country}) has been {VisaStatus}. Contact {BranchPhone} for details.",active:true},
  {id:"ET-005",name:"Leave Approval (Email)",trigger:"On leave approval",channel:"Email",subject:"Leave approved — {LeaveType} {Dates}",body:"Dear {EmployeeName},\n\nYour leave request for {LeaveType} from {FromDate} to {ToDate} has been approved.\n\nRegards,\nHR Team",active:true},
];


export const CUSTOM_FIELDS_DATA = [
  {id:"CF-001",master:"Customer",label:"Account Manager",type:"Dropdown",required:false,options:"Rohan,Mohan,Mujeet,Rujeet,Sujeet",active:true},
  {id:"CF-002",master:"Customer",label:"SLA Tier",type:"Dropdown",required:false,options:"Platinum,Gold,Silver,Standard",active:true},
  {id:"CF-003",master:"Customer",label:"Procurement Code",type:"Text",required:false,options:"",active:true},
  {id:"CF-004",master:"Customer",label:"Next Review Date",type:"Date",required:false,options:"",active:true},
  {id:"CF-005",master:"Supplier",label:"Reliability Rating",type:"Number (1-5)",required:false,options:"",active:true},
  {id:"CF-006",master:"Supplier",label:"Contract Expiry",type:"Date",required:false,options:"",active:true},
  {id:"CF-007",master:"Employee",label:"Emergency Contact",type:"Text",required:true,options:"",active:true},
  {id:"CF-008",master:"Employee",label:"Blood Group",type:"Dropdown",required:false,options:"A+,A-,B+,B-,O+,O-,AB+,AB-",active:true},
];


export const FIELD_ACCESS_DATA = [
  {field:"Credit Limit",module:"Customer",roles:{SuperAdmin:"View+Edit",Director:"View+Edit","Senior Finance Manager":"View+Edit","Sr. Accounts Executive":"View Only","Accounts Executive":"Hidden","HR Manager":"Hidden"}},
  {field:"Vendor PAN",module:"Supplier",roles:{SuperAdmin:"View+Edit",Director:"View+Edit","Senior Finance Manager":"View+Edit","Sr. Accounts Executive":"View+Edit","Accounts Executive":"Hidden","HR Manager":"Hidden"}},
  {field:"Bank Account No.",module:"Customer/Supplier",roles:{SuperAdmin:"View+Edit",Director:"View","Senior Finance Manager":"View","Sr. Accounts Executive":"View","Accounts Executive":"Hidden","HR Manager":"Hidden"}},
  {field:"Salary",module:"Employee",roles:{SuperAdmin:"View+Edit",Director:"View+Edit","Senior Finance Manager":"View+Edit","Sr. Accounts Executive":"Hidden","Accounts Executive":"Hidden","HR Manager":"View+Edit"}},
  {field:"Cost Center",module:"Voucher",roles:{SuperAdmin:"View+Edit",Director:"View","Senior Finance Manager":"View+Edit","Sr. Accounts Executive":"View+Edit","Accounts Executive":"View+Edit","HR Manager":"Hidden"}},
];


export const PERM_ROLES = ["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive","Accounts Executive","HR Manager"];

export const PERM_ACTIONS = ["View","Create","Edit","Delete","Approve","Export"];

/* ════════════════════════════════════════════════════════════════════
   14. DOCUMENT TEMPLATE EDITOR
   ════════════════════════════════════════════════════════════════════ */

export const STATUTORY_FILINGS = [
  {id:"F-001",type:"GSTR-1",  entity:"Travkings TKHO", period:"April 2026",dueDate:"2026-05-11",status:"Filed",   filedBy:"Sughra Sayed",filedDate:"2026-05-09",ack:"AB2526040001"},
  {id:"F-002",type:"GSTR-1",  entity:"Travkings BOM",  period:"April 2026",dueDate:"2026-05-11",status:"Filed",   filedBy:"Sughra Sayed",filedDate:"2026-05-09",ack:"AB2526040002"},
  {id:"F-003",type:"GSTR-1",  entity:"Travkings AMD",  period:"April 2026",dueDate:"2026-05-11",status:"Filed",   filedBy:"Sughra Sayed",filedDate:"2026-05-10",ack:"AB2526040003"},
  {id:"F-004",type:"GSTR-3B", entity:"Travkings TKHO", period:"April 2026",dueDate:"2026-05-20",status:"Due Today", filedBy:"-",        filedDate:"-",ack:"-"},
  {id:"F-005",type:"GSTR-3B", entity:"Travkings BOM",  period:"April 2026",dueDate:"2026-05-20",status:"Due Today", filedBy:"-",        filedDate:"-",ack:"-"},
  {id:"F-006",type:"GSTR-3B", entity:"Travkings AMD",  period:"April 2026",dueDate:"2026-05-20",status:"In Progress",filedBy:"Sughra Sayed",filedDate:"-",ack:"-"},
  {id:"F-007",type:"VAT-NBO", entity:"Travkings NBO",  period:"April 2026",dueDate:"2026-05-20",status:"Filed",   filedBy:"Faiz Patel",  filedDate:"2026-05-18",ack:"KE-VAT-2604"},
  {id:"F-008",type:"VAT-DAR", entity:"Travkings DAR",  period:"April 2026",dueDate:"2026-05-20",status:"In Progress",filedBy:"Faiz Patel", filedDate:"-",ack:"-"},
  {id:"F-009",type:"VAT-FBM", entity:"Travkings FBM",  period:"April 2026",dueDate:"2026-05-25",status:"Pending", filedBy:"-",          filedDate:"-",ack:"-"},
  {id:"F-010",type:"TDS-26Q", entity:"Travkings Group",period:"Q4 FY25-26",dueDate:"2026-05-31",status:"Pending", filedBy:"-",          filedDate:"-",ack:"-"},
  {id:"F-011",type:"TDS-24Q", entity:"Travkings Group",period:"Q4 FY25-26",dueDate:"2026-05-31",status:"Pending", filedBy:"-",          filedDate:"-",ack:"-"},
  {id:"F-012",type:"PF/ESI",  entity:"Travkings Group",period:"April 2026",dueDate:"2026-05-15",status:"Filed",   filedBy:"Sughra Sayed",filedDate:"2026-05-14",ack:"PF-2604-021"},
  {id:"F-013",type:"PT-Mah",  entity:"Travkings BOM",  period:"April 2026",dueDate:"2026-05-31",status:"Pending", filedBy:"-",          filedDate:"-",ack:"-"},
  {id:"F-014",type:"PT-Guj",  entity:"Travkings AMD",  period:"April 2026",dueDate:"2026-05-31",status:"Pending", filedBy:"-",          filedDate:"-",ack:"-"},
  {id:"F-015",type:"Adv-Tax", entity:"Travkings P Ltd",period:"Q1 FY26-27",dueDate:"2026-06-15",status:"Pending", filedBy:"-",          filedDate:"-",ack:"-"},
];


export const PERIOD_LOCK_STATE = {
  "BOM": {"2026-04":"hard","2026-05":"open","2026-03":"hard","2026-02":"hard","2026-01":"hard"},
  "AMD": {"2026-04":"hard","2026-05":"open","2026-03":"hard","2026-02":"hard","2026-01":"hard"},
  "NBO": {"2026-04":"soft","2026-05":"open","2026-03":"hard","2026-02":"hard","2026-01":"hard"},
  "DAR": {"2026-04":"soft","2026-05":"open","2026-03":"hard","2026-02":"hard","2026-01":"hard"},
  "FBM": {"2026-04":"soft","2026-05":"open","2026-03":"hard","2026-02":"hard","2026-01":"hard"},
  "TKHO":{"2026-04":"hard","2026-05":"open","2026-03":"hard","2026-02":"hard","2026-01":"hard"},
};


export const AUDIT_QUEUE_DATA = [
  {id:"VR-001",vno:"PV-BOM/2026/0921",branch:"BOM",date:"2026-05-19",postedBy:"Rohan",party:"Air India BSP",amount:285000,type:"Payment",status:"Pending Review",risk:"Low"},
  {id:"VR-002",vno:"PV-BOM/2026/0922",branch:"BOM",date:"2026-05-19",postedBy:"Rohan",party:"Dubai Wonders DMC",amount:124000,type:"Payment",status:"Pending Review",risk:"Low"},
  {id:"VR-003",vno:"JV-AMD/2026/0048",branch:"AMD",date:"2026-05-19",postedBy:"Mohan",party:"Internal — Provision",amount:48000,type:"Journal",status:"Flagged",risk:"Medium",note:"Round number provision — verify supporting"},
  {id:"VR-004",vno:"RV-AMD/2026/1542",branch:"AMD",date:"2026-05-18",postedBy:"Mohan",party:"Greenfield School",amount:680000,type:"Receipt",status:"Reviewed",risk:"Low",reviewedBy:"Sughra Sayed"},
  {id:"VR-005",vno:"PV-NBO/2026/0312",branch:"NBO",date:"2026-05-18",postedBy:"Mujeet",party:"Kenya Safari Lodge",amount:980000,type:"Payment",status:"Pending Review",risk:"Medium",note:"Above ₹5L — extra scrutiny"},
  {id:"VR-006",vno:"PV-DAR/2026/0198",branch:"DAR",date:"2026-05-18",postedBy:"Rujeet",party:"Serengeti Lodge",amount:540000,type:"Payment",status:"Pending Review",risk:"Low"},
  {id:"VR-007",vno:"CN-BOM/2026/0029",branch:"BOM",date:"2026-05-17",postedBy:"Rohan",party:"Sharma Enterprises",amount:185000,type:"Credit Note",status:"Flagged",risk:"High",note:"Credit note > ₹1L requires customer email confirmation"},
  {id:"VR-008",vno:"PV-FBM/2026/0142",branch:"FBM",date:"2026-05-17",postedBy:"Sujeet",party:"Local Hotel Lubumbashi",amount:124000,type:"Payment",status:"Reviewed",risk:"Low",reviewedBy:"Sughra Sayed"},
  {id:"VR-009",vno:"PV-BOM/2026/0918",branch:"BOM",date:"2026-05-17",postedBy:"Rohan",party:"VFS Global",amount:240000,type:"Payment",status:"Reviewed",risk:"Low",reviewedBy:"Sughra Sayed"},
  {id:"VR-010",vno:"JV-NBO/2026/0021",branch:"NBO",date:"2026-05-16",postedBy:"Mujeet",party:"Forex revaluation",amount:38500,type:"Journal",status:"Reviewed",risk:"Low",reviewedBy:"Faiz Patel"},
];


export const GROUP_DASH_DATA = {
  monthEnded:"April 2026",
  publishedOn:"2026-05-05",
  publishedBy:"Faiz Patel",
  pnlByBranch:[
    {branch:"BOM", revenue:38500000,cost:31650000,gp:6850000,gpPct:17.8,bookings:182},
    {branch:"AMD", revenue:14200000,cost:11720000,gp:2480000,gpPct:17.5,bookings:84},
    {branch:"NBO", revenue:18500000,cost:14300000,gp:4200000,gpPct:22.7,bookings:62},
    {branch:"DAR", revenue: 9800000,cost: 7120000,gp:2680000,gpPct:27.3,bookings:38},
    {branch:"FBM", revenue: 6400000,cost: 4550000,gp:1850000,gpPct:28.9,bookings:28},
    {branch:"TKHO",revenue:0,        cost:1240000,gp:-1240000,gpPct:0,   bookings:0},
  ],
  topConsultants:[
    {name:"Rohan (BOM)",   bookings:48,gp:1850000},
    {name:"Mohan (AMD)",   bookings:34,gp:1240000},
    {name:"Mujeet (NBO)",  bookings:26,gp:1180000},
    {name:"Rujeet (DAR)",  bookings:18,gp:920000},
    {name:"Sujeet (FBM)",  bookings:15,gp:680000},
  ],
  topCustomers:[
    {name:"L&T Limited",         revenue:4850000,branch:"BOM"},
    {name:"Reliance Industries", revenue:3450000,branch:"BOM"},
    {name:"Greenfield School",   revenue:2680000,branch:"AMD"},
    {name:"Safari Club Kenya",   revenue:2410000,branch:"NBO"},
    {name:"TechCorp Solutions",  revenue:1920000,branch:"BOM"},
  ],
  cash:{total:38980000,inr:32140000,usd:226500,kes:4250000,tzs:185000000},
  overdue:{count:38,amount:18450000,over90:6,over90amt:4200000},
};

/* ════════════════════════════════════════════════════════════════════
   1. HO ASSET PROCUREMENT WORKFLOW  (Point C)
   ════════════════════════════════════════════════════════════════════ */

export const AUTH_INITIAL_TXN = [
  /* Voucher Type, AE post, Sughra approve cap, Faiz approve cap, Afshin (above) */
  {type:"NEFT/RTGS Payment",      ae:0,      sughra:200000,  faiz:1000000,  afshin:"Above"},
  {type:"Cash Payment",            ae:5000,   sughra:25000,   faiz:100000,   afshin:"Above"},
  {type:"Forex Payment (USD eq.)", ae:0,      sughra:5000,    faiz:50000,    afshin:"Above"},
  {type:"Journal Voucher",         ae:0,      sughra:50000,   faiz:500000,   afshin:"Above"},
  {type:"Credit Note / Refund",    ae:0,      sughra:25000,   faiz:500000,   afshin:"Above"},
  {type:"Receipt Voucher",         ae:10000,  sughra:200000,  faiz:1000000,  afshin:"Any"},
  {type:"Asset Purchase",          ae:0,      sughra:0,       faiz:200000,   afshin:"Above"},
];


export const AUTH_INITIAL_MASTER = [
  /* Change Type, who can REQUEST (AE/Sughra/Faiz), who APPROVES (Sughra/Faiz/Afshin), thresholds */
  {change:"New Customer / Supplier",   req:{ae:true, sughra:true, faiz:true},  appr:{sughra:true,  faiz:false, afshin:false}, note:"Sughra approves after dup-check + credit check"},
  {change:"Credit Limit Change ≤ ₹10L",req:{ae:false,sughra:true, faiz:true},  appr:{sughra:false, faiz:true,  afshin:false}, note:"Faiz approves up to ₹10L"},
  {change:"Credit Limit Change > ₹10L",req:{ae:false,sughra:true, faiz:true},  appr:{sughra:false, faiz:false, afshin:true},  note:"Above ₹10L mandatory Director"},
  {change:"Vendor Bank A/c Change",    req:{ae:false,sughra:true, faiz:false}, appr:{sughra:false, faiz:true,  afshin:false}, note:"Highest-risk · email confirmation from vendor required"},
  {change:"Vendor PAN/GSTIN Change",   req:{ae:false,sughra:true, faiz:false}, appr:{sughra:false, faiz:true,  afshin:false}, note:"PAN change requires vendor consent letter"},
  {change:"Chart of Accounts Changes", req:{ae:false,sughra:false,faiz:true},  appr:{sughra:false, faiz:true,  afshin:false}, note:"Quarterly review only"},
  {change:"User Permissions Change",   req:{ae:false,sughra:false,faiz:true},  appr:{sughra:false, faiz:true,  afshin:false}, note:"Per spec — Faiz authority"},
  {change:"Approval Matrix Change",    req:{ae:false,sughra:false,faiz:true},  appr:{sughra:false, faiz:false, afshin:true},  note:"Director-only authority"},
  {change:"Tax Code / GST Rate Master",req:{ae:false,sughra:false,faiz:true},  appr:{sughra:false, faiz:true,  afshin:false}, note:"Statutory data — Faiz authority"},
];


export const ACTIVE_DELEGATIONS = [
  {id:"DG-001",delegator:"Faiz Patel",delegatee:"Sughra Sayed",scope:"Approvals up to ₹10L",from:"2026-06-10",to:"2026-06-17",reason:"Annual family vacation",status:"Scheduled",approvedBy:"Afshin Dhanani"},
  {id:"DG-002",delegator:"Sughra Sayed",delegatee:"Faiz Patel",scope:"All checker duties",from:"2026-05-25",to:"2026-05-27",reason:"Sister's wedding (Pune)",status:"Approved",approvedBy:"Faiz Patel"},
];


export const MASTER_CHANGE_QUEUE = [
  {id:"MC-2026-052",type:"Credit Limit Change",entity:"L&T Limited",detail:"Increase from ₹50L to ₹85L",requestedBy:"Sughra Sayed",requestDate:"2026-05-19",approver:"Faiz Patel",status:"Pending Approval",priority:"Normal"},
  {id:"MC-2026-051",type:"Vendor Bank A/c Change",entity:"Sharma Travels (Sub-agent)",detail:"Old: HDFC ...4422 → New: ICICI ...8891",requestedBy:"Sughra Sayed",requestDate:"2026-05-18",approver:"Faiz Patel",status:"Pending Approval",priority:"High",extraCheck:"Vendor email confirmation pending"},
  {id:"MC-2026-050",type:"New Customer",entity:"Innovate Tech Pvt Ltd",detail:"GSTIN 27AAACI8888K1ZN · Credit terms 30d · Credit limit ₹15L",requestedBy:"Rohan (BOM)",requestDate:"2026-05-17",approver:"Sughra Sayed",status:"Approved",priority:"Normal",approvedDate:"2026-05-18"},
  {id:"MC-2026-049",type:"Credit Limit Change",entity:"TechCorp Solutions",detail:"Increase from ₹20L to ₹45L (within Faiz limit)",requestedBy:"Sughra Sayed",requestDate:"2026-05-15",approver:"Faiz Patel",status:"Approved",priority:"Normal",approvedDate:"2026-05-16"},
  {id:"MC-2026-048",type:"User Permissions Change",entity:"Mujeet (TK-NBO-003)",detail:"Grant Reports → Profitability access",requestedBy:"Faiz Patel",requestDate:"2026-05-14",approver:"Faiz Patel",status:"Approved",priority:"Normal",approvedDate:"2026-05-14"},
  {id:"MC-2026-047",type:"Vendor PAN/GSTIN Change",entity:"Hertz Car Rental",detail:"Update GSTIN format change post-amendment",requestedBy:"Sughra Sayed",requestDate:"2026-05-12",approver:"Faiz Patel",status:"Rejected",priority:"Normal",rejectReason:"Vendor consent letter not attached",approvedDate:"2026-05-13"},
];

/* ════════════════════════════════════════════════════════════════════
   1. AUTHORITY CONFIGURATION CENTER (5 tabs)
   ════════════════════════════════════════════════════════════════════ */

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

export const MOD_DATA=[];

export const MIX=[];

export const CASH=[];

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

export const CUSTOMERS=[];

export const BOOKINGS=[]
/* ── Ticket registry — for unmatched ticket detection ─────────────
   SALES_TICKETS: every flight ticket raised on a sales voucher
   PURCH_TICKETS: every ticket entered on a purchase / BSP voucher
   Matching key: ticket number (unique per IATA ticket)
   ─────────────────────────────────────────────────────────────── */

export const SALES_TICKETS=[];


export const PURCH_TICKETS=[];

/* ══ Shared utility functions & style constants ══════════════════ */

/* Number formatter */

export const MODULE_ICONS={
  Flight:"✈",Holiday:"🌴",Hotel:"🏨",Car:"🚗",
  Visa:"🛂",Insurance:"🛡",Misc:"📦",
};

/* Booking status styles */

export const PURCHASE_REGISTRY={ PF:[], PH:[], PHT:[], PC:[], PV:[], PI:[], PM:[] };


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

export const REC_D=[];

export const GP_BILLS=[];


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



export const EXP_ACTUALS=[];

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

export const HR_EMPLOYEES_DATA=[];


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



export const FOREX_RATES_DATA=[];

/* ── Proforma / Quote store ─── */

export const NOTIFICATIONS_DATA=[];

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

export const ADM_DATA=[];

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
  /* Creditors */
  {id:"bsp_india",name:"BSP India Payable",           group:"Current Liabilities",nature:"Cr",type:"Creditor",branch:"ALL",currency:"INR"},
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



export const LOAN_REGISTER = [];


export const EMP_LOANS_DATA = [];


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


export const FY_TARGETS_DATA = [];


export const KEY_ALERTS_DATA = [];


export const CASH_FORECAST_13W = [];


export const HR_STATS_DATA = { totalHeadcount:0, changeThisMonth:0, attendancePct:0, pendingLeave:0, payrollStatus:"", openPositions:0, birthdays:[], anniversaries:[] };


export const INTERBRANCH_ELIMINATIONS = [];


export const YIELD_BY_DESTINATION = [];


export const YIELD_BY_CONSULTANT = [];


export const YIELD_BY_SUPPLIER = [];


export const YOY_PL = [];


export const LEAVE_UTILIZATION = [];


export const TAX_FILING_BOARD = [];


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

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { testsAPI, batchesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

// ─── HELPERS ──────────────────────────────────────────────────
function gradeColor(g) {
  const c = { 'A+':'#15803d','A':'#16a34a','B+':'#0f766e','B':'#0369a1','C':'#b45309','D':'#c2410c','F':'#b91c1c' };
  return c[g] || '#64748b';
}
function gradeBg(g) {
  const c = { 'A+':'#f0fdf4','A':'#f0fdf4','B+':'#f0fdfa','B':'#eff6ff','C':'#fffbeb','D':'#fff7ed','F':'#fef2f2' };
  return c[g] || '#f8fafc';
}
function pctColor(p) {
  if (p >= 75) return '#16a34a';
  if (p >= 50) return '#d97706';
  return '#dc2626';
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────
function Btn({ children, onClick, variant='default', size='md', disabled, style: ex, type='button' }) {
  const [h, setH] = useState(false);
  const v = {
    default: { bg: h?'#f1f5f9':'#fff',    border:'#cbd5e1', color:'#374151' },
    primary: { bg: h?'#1d4ed8':'#2563eb', border:'#2563eb', color:'#fff'    },
    danger:  { bg: h?'#fee2e2':'#fef2f2', border:'#fecaca', color:'#b91c1c' },
    amber:   { bg: h?'#fef3c7':'#fffbeb', border:'#fde68a', color:'#b45309' },
    navy:    { bg: h?'#162d55':'#0f2040', border:'#0f2040', color:'#fff'    },
    ghost:   { bg:'transparent', border:'transparent', color: h?'#0f172a':'#64748b' },
  }[variant] || {};
  const pad = { sm:'5px 12px', md:'8px 16px', lg:'11px 22px' }[size];
  const fs  = { sm:12, md:13, lg:14 }[size];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:pad,background:v.bg,border:`1.5px solid ${v.border}`,borderRadius:9,color:v.color,cursor:disabled?'not-allowed':'pointer',fontSize:fs,fontWeight:600,fontFamily:'inherit',transition:'all 0.15s',opacity:disabled?0.55:1,whiteSpace:'nowrap',...ex }}>
      {children}
    </button>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4 }}>
        {label}{required&&<span style={{ color:'#ef4444',marginLeft:3 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize:11,color:'#dc2626',marginTop:4 }}>⚠ {error}</div>}
    </div>
  );
}

const IS = { width:'100%',padding:'9px 12px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:9,color:'#0f172a',fontSize:13,fontFamily:'inherit',outline:'none',transition:'all 0.2s',boxSizing:'border-box' };
function Input({ value, onChange, type='text', placeholder, min, max }) {
  const [f,setF] = useState(false);
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
    style={{ ...IS,...(f?{borderColor:'#2563eb',background:'#fff',boxShadow:'0 0 0 3px rgba(37,99,235,0.1)'}:{}) }}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)} />;
}
function Sel({ value, onChange, children }) {
  const [f,setF] = useState(false);
  return <select value={value} onChange={onChange}
    style={{ ...IS,...(f?{borderColor:'#2563eb',background:'#fff',boxShadow:'0 0 0 3px rgba(37,99,235,0.1)'}:{}),cursor:'pointer' }}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}>{children}</select>;
}
function Textarea({ value, onChange, placeholder, rows=3 }) {
  const [f,setF] = useState(false);
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
    style={{ ...IS,resize:'vertical',minHeight:70,...(f?{borderColor:'#2563eb',background:'#fff',boxShadow:'0 0 0 3px rgba(37,99,235,0.1)'}:{}) }}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)} />;
}

function Modal({ title, subtitle, onClose, children, footer, size=560 }) {
  useEffect(()=>{ const fn=e=>{ if(e.key==='Escape') onClose(); }; document.addEventListener('keydown',fn); return ()=>document.removeEventListener('keydown',fn); },[onClose]);
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(10,22,44,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#fff',borderRadius:16,width:size,maxWidth:'100%',maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid #e2e8f0' }}>
        <div style={{ padding:'18px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'flex-start',justifyContent:'space-between',position:'sticky',top:0,background:'#fff',zIndex:1 }}>
          <div>
            <div style={{ fontSize:16,fontWeight:700,color:'#0f172a' }}>{title}</div>
            {subtitle&&<div style={{ fontSize:12,color:'#94a3b8',marginTop:3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:22,lineHeight:1,padding:'0 0 0 16px' }}>×</button>
        </div>
        <div style={{ padding:'20px 24px' }}>{children}</div>
        {footer&&<div style={{ padding:'14px 24px',borderTop:'1px solid #f1f5f9',display:'flex',gap:10,justifyContent:'flex-end',position:'sticky',bottom:0,background:'#fff' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── BLANK FORM ───────────────────────────────────────────────
const BF = { title:'', subject:'', testDate:'', totalMarks:'100', batchId:'', description:'', isCombined:false, components:[] };
const BC = { subject: '', total: 100 };

// ═════════════════════════════════════════════════════════════
export default function InstTests() {
  const { user } = useAuth();
  const [tests, setTests]         = useState([]);
  const [batches, setBatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterBatch, setFB]      = useState('');

  // modals
  const [addOpen, setAddOpen]     = useState(false);
  const [editData, setEditData]   = useState(null);
  const [resultTest, setRTest]    = useState(null); // test + students for marks entry
  const [viewTest, setViewTest]   = useState(null); // read-only results view
  const [delTest, setDelTest]     = useState(null);

  const [form, setForm]           = useState(BF);
  const [errs, setErrs]           = useState({});
  const [saving, setSaving]       = useState(false);

  // marks entry state (studentId -> marksScored)
  const [marks, setMarks]         = useState({});
  const [compScores, setCompScores] = useState({});
  const [remarks, setRemarks]     = useState({});
  const [savingMarks, setSavingM] = useState(false);

  // ── LOAD ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([testsAPI.getAll(), batchesAPI.getAll()]);
      const parsedTests = t.data.data.map(test => {
        if (test.components && typeof test.components === 'string') {
          try {
            test.components = JSON.parse(test.components);
            if (typeof test.components === 'string') test.components = JSON.parse(test.components);
          } catch (e) { test.components = []; }
        }
        return test;
      });
      setTests(parsedTests);
      setBatches(b.data.data);
    } catch { toast.error('Failed to load tests'); }
    finally   { setLoading(false); }
  }, []);
  useEffect(()=>{ load(); },[load]);

  // ── FILTER ────────────────────────────────────────────────
  const filtered = tests.filter(t => !filterBatch || String(t.batch_id) === filterBatch);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── VALIDATE ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim())   e.title   = 'Test title is required';
    if (!form.isCombined && !form.subject.trim()) e.subject = 'Subject is required';
    if (form.isCombined && form.components.length === 0) e.components = 'At least one subject is required';
    if (!form.testDate)       e.testDate = 'Test date is required';
    if (!form.isCombined && (!form.totalMarks || isNaN(form.totalMarks) || +form.totalMarks <= 0))
      e.totalMarks = 'Enter valid total marks';
    setErrs(e);
    return !Object.keys(e).length;
  };

  // ── CREATE TEST ───────────────────────────────────────────
  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, totalMarks: Number(form.totalMarks), batchId: form.batchId || null };
      if (form.isCombined) {
        payload.totalMarks = form.components.reduce((a, c) => a + Number(c.total), 0);
      }
      await testsAPI.create(payload);
      setAddOpen(false);
      setForm(BF); setErrs({});
      await load();
      toast.success('Test created!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create test'); }
    finally { setSaving(false); }
  };

  // ── EDIT TEST ─────────────────────────────────────────────
  const openEdit = t => {
    setForm({ 
      title:t.title, 
      subject:t.subject, 
      testDate:t.test_date, 
      totalMarks:String(t.total_marks), 
      batchId:t.batch_id?String(t.batch_id):'', 
      description:t.description||'',
      isCombined: !!t.is_combined,
      components: t.components ? (typeof t.components === 'string' ? JSON.parse(t.components) : t.components) : []
    });
    setErrs({}); setEditData(t);
  };
  const handleEdit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, totalMarks: Number(form.totalMarks), batchId: form.batchId || null };
      if (form.isCombined) {
        payload.totalMarks = form.components.reduce((a, c) => a + Number(c.total), 0);
      }
      await testsAPI.update(editData.id, payload);
      setEditData(null); await load(); toast.success('Test updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  // ── DELETE TEST ───────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await testsAPI.delete(delTest.id);
      setDelTest(null); await load(); toast.success('Test deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── OPEN MARKS ENTRY ──────────────────────────────────────
  const openMarkEntry = async (test) => {
    try {
      const r = await testsAPI.getOne(test.id);
      const data = r.data.data;
      if (data.components && typeof data.components === 'string') {
        try {
          data.components = JSON.parse(data.components);
          if (typeof data.components === 'string') data.components = JSON.parse(data.components);
        } catch (e) { data.components = []; }
      }
      
      // Pre-fill existing marks
      const m = {}, rm = {}, cs = {};
      data.students.forEach(s => {
        m[s.student_id]  = s.marks_scored !== null && s.marks_scored !== undefined ? String(s.marks_scored) : '';
        rm[s.student_id] = s.remarks || '';
        
        let cScores = s.component_scores;
        if (cScores && typeof cScores === 'string') {
          try {
            cScores = JSON.parse(cScores);
            if (typeof cScores === 'string') cScores = JSON.parse(cScores);
          } catch(e) { cScores = {}; }
        }
        cs[s.student_id] = cScores || {};
      });
      setMarks(m); setRemarks(rm); setCompScores(cs);
      setRTest(data);
    } catch { toast.error('Failed to load test data'); }
  };

  // ── OPEN VIEW RESULTS ─────────────────────────────────────
  const openView = async (test) => {
    try {
      const r = await testsAPI.getOne(test.id);
      const data = r.data.data;
      if (data.components && typeof data.components === 'string') {
        try {
          data.components = JSON.parse(data.components);
          if (typeof data.components === 'string') data.components = JSON.parse(data.components);
        } catch(e) { data.components = []; }
      }
      setViewTest(data);
    } catch { toast.error('Failed to load results'); }
  };

  // ── SAVE MARKS ────────────────────────────────────────────
  const saveMarks = async () => {
    const isCombined = !!resultTest.is_combined;
    for (const s of resultTest.students) {
      if (isCombined) {
        const studentComps = compScores[s.student_id] || {};
        const hasAny = resultTest.components.some(c => studentComps[c.subject] !== undefined && studentComps[c.subject] !== '');
        if (hasAny) {
          for (const c of resultTest.components) {
            const val = studentComps[c.subject] ?? '';
            if (val !== '') {
              const cNum = parseFloat(val);
              if (isNaN(cNum) || cNum < 0 || cNum > parseFloat(c.total)) {
                toast.error(`Invalid marks for ${s.name} in ${c.subject}. Must be between 0 and ${c.total}.`);
                return;
              }
            }
          }
        }
      } else {
        const val = marks[s.student_id] ?? '';
        if (val !== '') {
          const mNum = parseFloat(val);
          if (isNaN(mNum) || mNum < 0 || mNum > parseFloat(resultTest.total_marks)) {
            toast.error(`Invalid marks for ${s.name}. Must be between 0 and ${resultTest.total_marks}.`);
            return;
          }
        }
      }
    }

    setSavingM(true);
    try {
      const results = resultTest.students.map(s => {
        let marksScored = null;
        let componentScores = null;

        if (isCombined) {
          const studentComps = compScores[s.student_id] || {};
          const hasAny = resultTest.components.some(c => studentComps[c.subject] !== undefined && studentComps[c.subject] !== '');
          if (hasAny) {
            marksScored = resultTest.components.reduce((sum, c) => sum + (parseFloat(studentComps[c.subject]) || 0), 0);
            componentScores = studentComps;
          }
        } else {
          const val = marks[s.student_id] ?? '';
          if (val !== '') {
            marksScored = parseFloat(val);
          }
        }

        return {
          studentId: s.student_id,
          marksScored,
          remarks: remarks[s.student_id] || '',
          componentScores
        };
      });

      await testsAPI.saveResults(resultTest.id, { results });
      toast.success('Marks saved successfully!');
      setRTest(null); await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save marks'); }
    finally { setSavingM(false); }
  };

  // ── PDF GENERATION ────────────────────────────────────────
  const downloadPDF = (test) => {
    const doc = new jsPDF();
    const instName = user?.name || 'EduAttend Institute';

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 32, 64); // Navy
    doc.text(instName, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('TEST RESULT SHEET', 105, 28, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 35, 190, 35);

    // Test Details Info Box
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFont('helvetica', 'bold');
    doc.text(`Test: ${test.title}`, 20, 48);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Subject: ${test.is_combined ? 'Combined' : (test.subject || '—')}`, 20, 56);
    doc.text(`Batch: ${test.batch_name || 'All Batches'}`, 20, 62);
    
    const fmtDate = new Date(test.test_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    doc.text(`Date: ${fmtDate}`, 190, 48, { align: 'right' });
    doc.text(`Total Marks: ${parseFloat(test.total_marks).toFixed(2)}`, 190, 56, { align: 'right' });

    // Table
    let tableHead = ['#', 'Student Name', 'Class'];
    let columnStyles = { 0: { cellWidth: 10 } };
    
    if (test.is_combined && test.components) {
      const subjects = test.components.map(c => c.subject);
      tableHead = [...tableHead, ...subjects, 'Total', 'Grade'];
      // Adjust column styles for many subjects
      subjects.forEach((_, i) => { columnStyles[i + 3] = { halign: 'center' }; });
      columnStyles[subjects.length + 3] = { fontStyle: 'bold', halign: 'center' };
      columnStyles[subjects.length + 4] = { fontStyle: 'bold', halign: 'center' };
    } else {
      tableHead = [...tableHead, 'Marks', 'Percentage', 'Grade'];
      columnStyles[3] = { halign: 'center' };
      columnStyles[4] = { fontStyle: 'bold', halign: 'center' };
      columnStyles[5] = { fontStyle: 'bold', halign: 'center' };
    }

    const tableData = test.students.map((s, i) => {
      const hasResult = s.marks_scored !== null && s.marks_scored !== undefined;
      let row = [i + 1, s.name, `Class ${s.class}`];
      
      if (test.is_combined && test.components) {
        const scores = s.component_scores ? (typeof s.component_scores === 'string' ? JSON.parse(s.component_scores) : s.component_scores) : {};
        test.components.forEach(c => {
          row.push(scores[c.subject] !== undefined ? scores[c.subject] : '—');
        });
        row.push(hasResult ? `${s.marks_scored} / ${test.total_marks}` : '—');
        row.push(s.grade || '—');
      } else {
        const pct = hasResult ? Math.round((parseFloat(s.marks_scored) / parseFloat(test.total_marks)) * 100) : 0;
        row.push(hasResult ? `${s.marks_scored} / ${test.total_marks}` : '—');
        row.push(hasResult ? pct + '%' : '—');
        row.push(s.grade || '—');
      }
      return row;
    });

    autoTable(doc, {
      startY: 65,
      head: [tableHead],
      body: tableData,
      headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 9, halign: 'left' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: columnStyles
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString()} by EduAttend System`, 105, finalY + 15, { align: 'center' });

    doc.save(`${test.title}_Results.pdf`);
    toast.success('Result sheet downloaded!');
  };

  // ── STAT helpers ──────────────────────────────────────────
  const enteredCount = resultTest
    ? resultTest.students.filter(s => {
        if (resultTest.is_combined) {
          const studentComps = compScores[s.student_id] || {};
          return resultTest.components.some(c => studentComps[c.subject] !== undefined && studentComps[c.subject] !== '');
        } else {
          return marks[s.student_id] !== '' && marks[s.student_id] !== undefined;
        }
      }).length
    : 0;

  if (loading) return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div style={{ padding:'14px 24px',background:'#fff',borderBottom:'1px solid #f1f5f9' }}><div style={{ fontSize:17,fontWeight:700 }}>Tests & Results</div></div>
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
        <div style={{ width:32,height:32,border:'3px solid #e2e8f0',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ padding:'14px 24px',background:'#fff',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ fontSize:17,fontWeight:700,color:'#0f172a',letterSpacing:-0.4 }}>Tests & Results</div>
          <div style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>Create tests, enter marks per student, let parents view results</div>
        </div>
        <Btn variant="primary" onClick={()=>{ setForm(BF); setErrs({}); setAddOpen(true); }}>＋ Create Test</Btn>
      </div>

      {/* BODY */}
      <div style={{ flex:1,overflowY:'auto',background:'#f8fafc' }}>
        <div style={{ padding:'20px 24px' }}>

          {/* Stats */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:12,marginBottom:20 }}>
            {[
              { label:'Total Tests', value:tests.length, color:'#0f172a' },
              { label:'With Results', value:tests.filter(t=>t.results_entered>0).length, color:'#16a34a' },
              { label:'Pending Entry', value:tests.filter(t=>(t.total_students||0)>(t.results_entered||0)).length, color:'#d97706' },
            ].map(s=>(
              <div key={s.label} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:24,fontWeight:700,color:s.color,letterSpacing:-1 }}>{s.value}</div>
                <div style={{ fontSize:11,color:'#94a3b8',marginTop:4,fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display:'flex',gap:10,marginBottom:14 }}>
            <select value={filterBatch} onChange={e=>setFB(e.target.value)}
              style={{ padding:'9px 12px',background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:9,color:'#374151',fontFamily:'inherit',fontSize:13,outline:'none',cursor:'pointer' }}>
              <option value="">All Batches</option>
              {batches.map(b=><option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>

          {/* Test List */}
          {filtered.length === 0 ? (
            <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'60px 20px',textAlign:'center' }}>
              <div style={{ fontSize:40,marginBottom:12 }}>📝</div>
              <div style={{ fontSize:15,fontWeight:600,color:'#334155',marginBottom:6 }}>No tests yet</div>
              <div style={{ fontSize:13,color:'#94a3b8',marginBottom:20 }}>Create your first test to start entering marks</div>
              <Btn variant="primary" onClick={()=>{ setForm(BF); setErrs({}); setAddOpen(true); }}>＋ Create First Test</Btn>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {filtered.map(test => {
                const entered   = test.results_entered || 0;
                const total     = test.total_students  || 0;
                const pct       = total > 0 ? Math.round(entered/total*100) : 0;
                const allDone   = total > 0 && entered >= total;
                return (
                  <div key={test.id} style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
                    {/* Left: info */}
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4 }}>
                        <div style={{ fontSize:15,fontWeight:700,color:'#0f172a' }}>{test.title}</div>
                        <span style={{ display:'inline-flex',padding:'2px 9px',background:test.is_combined?'#f5f3ff':'#eff6ff',border:`1px solid ${test.is_combined?'#ddd6fe':'#bfdbfe'}`,borderRadius:20,fontSize:11,fontWeight:600,color:test.is_combined?'#7c3aed':'#1d4ed8' }}>
                          {test.is_combined ? 'Combined Test' : test.subject}
                        </span>
                        {test.batch_name && (
                          <span style={{ display:'inline-flex',padding:'2px 9px',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:20,fontSize:11,fontWeight:600,color:'#0f766e' }}>
                            {test.batch_name}
                          </span>
                        )}
                        {allDone && <span style={{ display:'inline-flex',padding:'2px 9px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:20,fontSize:11,fontWeight:600,color:'#15803d' }}>✓ Complete</span>}
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:16,fontSize:12,color:'#64748b',flexWrap:'wrap' }}>
                        <span>📅 <strong style={{ color:'#0f172a' }}>{test.test_date}</strong></span>
                        <span>🎯 Total Marks: <strong style={{ color:'#0f172a' }}>{test.total_marks}</strong></span>
                        <span>👥 Results: <strong style={{ color: allDone?'#15803d':entered>0?'#d97706':'#dc2626' }}>{entered}/{total}</strong></span>
                      </div>
                      {total > 0 && (
                        <div style={{ marginTop:8,height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden',maxWidth:300 }}>
                          <div style={{ height:'100%',width:`${pct}%`,background:allDone?'#16a34a':'#2563eb',borderRadius:3,transition:'width 0.3s' }} />
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div style={{ display:'flex',gap:6,flexWrap:'wrap',flexShrink:0 }}>
                      <Btn size="sm" variant="primary" onClick={()=>openMarkEntry(test)}>
                        ✏️ Enter Marks
                      </Btn>
                      <Btn size="sm" onClick={()=>openView(test)}>📊 View Results</Btn>
                      <Btn size="sm" onClick={()=>openEdit(test)}>Edit</Btn>
                      <Btn size="sm" variant="danger" onClick={()=>setDelTest(test)}>Delete</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ CREATE / EDIT TEST MODAL ══════════════════════════════ */}
      {(addOpen || editData) && (
        <Modal
          title={addOpen ? 'Create New Test' : 'Edit Test'}
          subtitle={addOpen ? 'Fill in the test details below' : `Editing: ${editData.title}`}
          onClose={()=>{ setAddOpen(false); setEditData(null); }}
          footer={<>
            <Btn onClick={()=>{ setAddOpen(false); setEditData(null); }}>Cancel</Btn>
            <Btn variant="primary" onClick={addOpen?handleAdd:handleEdit} disabled={saving}>
              {saving ? 'Saving…' : addOpen ? 'Create Test' : 'Save Changes'}
            </Btn>
          </>}
        >
          <div style={{ marginBottom: 15 }}>
            <Field label="Test Title" required error={errs.title} children={<Input value={form.title} onChange={f('title')} placeholder="Title" />} />
            <div style={{ marginTop: -5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text2)' }}>
                <input type="checkbox" checked={form.isCombined} onChange={e => setForm(p => ({ ...p, isCombined: e.target.checked }))} />
                Combine Multiple Subjects?
              </label>
            </div>
          </div>

          {!form.isCombined ? (
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
              <Field label="Subject" required error={errs.subject} children={<Input value={form.subject} onChange={f('subject')} placeholder="e.g. Mathematics" />} />
              <Field label="Total Marks" required error={errs.totalMarks}
                children={<Input type="number" value={form.totalMarks} onChange={f('totalMarks')} min="1" max="1000" placeholder="100" />} />
              <Field label="Test Date" required error={errs.testDate}
                children={<Input type="date" value={form.testDate} onChange={f('testDate')} max={new Date().toISOString().split('T')[0]} />} />
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Subject Components</div>
              <div style={{ background: '#f8fafc', padding: 15, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                {form.components.map((c, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 40px', gap: 10, marginBottom: 8 }}>
                    <Input value={c.subject} placeholder="Physics" onChange={e => {
                      const nc = [...form.components]; nc[i].subject = e.target.value; setForm(p => ({ ...p, components: nc }));
                    }} />
                    <Input type="number" value={c.total} placeholder="100" onChange={e => {
                      const nc = [...form.components]; nc[i].total = e.target.value; setForm(p => ({ ...p, components: nc }));
                    }} />
                    <button className="btn btn-sm btn-red" onClick={() => {
                      const nc = form.components.filter((_, idx) => idx !== i); setForm(p => ({ ...p, components: nc }));
                    }}>×</button>
                  </div>
                ))}
                <Btn size="sm" variant="ghost" onClick={() => setForm(p => ({ ...p, components: [...p.components, { ...BC }] }))}>+ Add Subject</Btn>
                {errs.components && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 5 }}>{errs.components}</div>}
              </div>
              <div style={{ marginTop: 10 }}>
                <Field label="Test Date" required error={errs.testDate}
                  children={<Input type="date" value={form.testDate} onChange={f('testDate')} max={new Date().toISOString().split('T')[0]} />} />
              </div>
            </div>
          )}

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <Field label="Batch (optional)"
              children={<Sel value={form.batchId} onChange={f('batchId')}><option value="">All Batches</option>{batches.map(b=><option key={b.id} value={String(b.id)}>{b.name}</option>)}</Sel>} />
          </div>
          
          <Field label="Description / Notes (optional)"
            children={<Textarea value={form.description} onChange={f('description')} placeholder="Any instructions, syllabus covered, etc." />} />
        </Modal>
      )}

      {/* ══ MARKS ENTRY MODAL ════════════════════════════════════ */}
      {resultTest && (
        <Modal
          title={`Enter Marks — ${resultTest.title}`}
          subtitle={`📅 ${new Date(resultTest.test_date).toLocaleDateString('en-US', {day:'numeric',month:'short',year:'numeric'})}  ·  📚 ${resultTest.is_combined ? 'Combined' : (resultTest.subject || '—')}  ·  🎯 Total: ${resultTest.total_marks} marks  ·  ${resultTest.batch_name || 'All Batches'}`}
          onClose={()=>setRTest(null)}
          size={680}
          footer={<>
            <div style={{ fontSize:12,color:'#64748b',flex:1 }}>
              Entered: <strong style={{ color:'#0f172a' }}>{enteredCount}/{resultTest.students.length}</strong> students
            </div>
            <Btn onClick={()=>setRTest(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={saveMarks} disabled={savingMarks}>{savingMarks?'Saving…':'Save All Marks'}</Btn>
          </>}
        >
          {/* Info banner */}
          <div style={{ background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#1d4ed8',display:'flex',alignItems:'center',gap:8 }}>
            <span>ℹ️</span> Enter marks out of <strong>{resultTest.total_marks}</strong>. Leave blank to skip. Grades are calculated automatically.
          </div>

          {resultTest.students.length === 0 ? (
            <div style={{ textAlign:'center',padding:'40px 20px',color:'#94a3b8' }}>No students found in this batch.</div>
          ) : (
            <div style={{ border:'1px solid #e2e8f0',borderRadius:10,overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['#','Student Name','Class','Marks Scored','Grade','Remarks'].map(h=>(
                      <th key={h} style={{ textAlign:'left',padding:'9px 13px',color:'#94a3b8',fontWeight:600,fontSize:11,borderBottom:'1px solid #e2e8f0',textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultTest.students.map((s, idx) => {
                    const isCombined = !!resultTest.is_combined;
                    let valid = false;
                    let hasAny = false;
                    let mNum = 0;

                    if (isCombined) {
                      const studentComps = compScores[s.student_id] || {};
                      hasAny = resultTest.components.some(c => studentComps[c.subject] !== undefined && studentComps[c.subject] !== '');
                      const allValid = resultTest.components.every(c => {
                        const val = studentComps[c.subject] ?? '';
                        if (val === '') return true;
                        const cNum = parseFloat(val);
                        return !isNaN(cNum) && cNum >= 0 && cNum <= parseFloat(c.total);
                      });
                      valid = hasAny && allValid;
                      mNum = resultTest.components.reduce((sum, c) => sum + (parseFloat(studentComps[c.subject]) || 0), 0);
                    } else {
                      const val = marks[s.student_id] ?? '';
                      hasAny = val !== '';
                      mNum = parseFloat(val);
                      valid = hasAny && !isNaN(mNum) && mNum >= 0 && mNum <= parseFloat(resultTest.total_marks);
                    }

                    const pct  = valid ? Math.round((mNum / parseFloat(resultTest.total_marks)) * 100) : null;
                    const g    = valid ? (['A+','A','B+','B','C','D','F'][pct>=90?0:pct>=80?1:pct>=70?2:pct>=60?3:pct>=50?4:pct>=35?5:6]) : null;
                    const isError = hasAny && !valid;

                    return (
                      <tr key={s.student_id} style={{ borderBottom:'1px solid #f1f5f9',background:valid?'#fafffe':'transparent' }}>
                        <td style={{ padding:'10px 13px',color:'#94a3b8',fontWeight:600 }}>{idx+1}</td>
                        <td style={{ padding:'10px 13px' }}>
                          <div style={{ fontWeight:600,color:'#0f172a' }}>{s.name}</div>
                        </td>
                        <td style={{ padding:'10px 13px' }}>
                          <span style={{ padding:'2px 8px',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:20,fontSize:11,fontWeight:600,color:'#0f766e',whiteSpace:'nowrap' }}>Class {s.class}</span>
                        </td>
                        <td style={{ padding:'10px 13px' }}>
                          {!isCombined ? (
                            <input
                              type="number" min="0" max={resultTest.total_marks} step="0.5"
                              value={marks[s.student_id] ?? ''}
                              onChange={e => setMarks(p => ({ ...p, [s.student_id]: e.target.value }))}
                              placeholder={`/ ${resultTest.total_marks}`}
                              style={{ width:90,padding:'7px 10px',background:'#f8fafc',border:`1.5px solid ${valid?'#16a34a':isError?'#dc2626':'#e2e8f0'}`,borderRadius:8,fontSize:13,color:'#0f172a',fontFamily:'inherit',outline:'none',fontWeight:600,transition:'all 0.2s' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                                {resultTest.components.map((c, ci) => {
                                  const val = compScores[s.student_id]?.[c.subject] ?? '';
                                  const cNum = parseFloat(val);
                                  const cValid = val === '' || (!isNaN(cNum) && cNum >= 0 && cNum <= parseFloat(c.total));
                                  return (
                                    <div key={ci}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>{c.subject}</div>
                                      <input
                                        type="number" min="0" max={c.total} step="0.5"
                                        value={val}
                                        placeholder={`0 / ${c.total}`}
                                        onChange={e => {
                                          const ncs = { ...compScores };
                                          if (!ncs[s.student_id]) ncs[s.student_id] = {};
                                          ncs[s.student_id][c.subject] = e.target.value;
                                          setCompScores(ncs);
                                        }}
                                        style={{ width: '100%', padding: '6px 9px', background: '#fff', border: `1.5px solid ${val === '' ? 'var(--border)' : cValid ? '#16a34a' : '#dc2626'}`, borderRadius: 7, fontSize: 13, fontWeight: 600, outline: 'none' }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              {hasAny && (
                                <div style={{ background: valid ? 'var(--blue-bg)' : '#fef2f2', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: valid ? 'var(--blue-text)' : '#b91c1c', alignSelf: 'flex-start', border: `1px solid ${valid ? '#bfdbfe' : '#fecaca'}` }}>
                                  Sum: {mNum} / {resultTest.total_marks} {!valid && '(Invalid Marks)'}
                                </div>
                              )}
                            </div>
                          )}
                          {isError && !isCombined && <div style={{ fontSize:11,color:'#dc2626',marginTop:3 }}>Max: {resultTest.total_marks}</div>}
                        </td>
                        <td style={{ padding:'10px 13px' }}>
                          {g ? (
                            <span style={{ display:'inline-flex',padding:'3px 10px',background:gradeBg(g),border:`1px solid ${gradeColor(g)}33`,borderRadius:20,fontSize:12,fontWeight:700,color:gradeColor(g) }}>
                              {g} {pct !== null && <span style={{ marginLeft:5,fontWeight:400,opacity:0.7 }}>({pct}%)</span>}
                            </span>
                          ) : <span style={{ color:'#cbd5e1',fontSize:12 }}>—</span>}
                        </td>
                        <td style={{ padding:'10px 13px' }}>
                          <input
                            type="text" value={remarks[s.student_id] ?? ''}
                            onChange={e => setRemarks(p => ({ ...p, [s.student_id]: e.target.value }))}
                            placeholder="Optional remarks"
                            style={{ width:'100%',minWidth:120,padding:'7px 10px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:12,color:'#0f172a',fontFamily:'inherit',outline:'none' }}
                            onFocus={e=>{ e.target.style.borderColor='#2563eb'; e.target.style.background='#fff'; }}
                            onBlur={e=>{ e.target.style.borderColor='#e2e8f0'; e.target.style.background='#f8fafc'; }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* ══ VIEW RESULTS MODAL ════════════════════════════════════ */}
      {viewTest && (
        <Modal
          title={`Results — ${viewTest.title}`}
          subtitle={`📅 ${new Date(viewTest.test_date).toLocaleDateString('en-US', {day:'numeric',month:'short',year:'numeric'})}  ·  📚 ${viewTest.is_combined ? 'Combined' : (viewTest.subject || '—')}  ·  🎯 Total: ${viewTest.total_marks}  ·  ${viewTest.batch_name||'All Batches'}`}
          size={680}
          footer={
            <>
              <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                <Btn variant="navy" onClick={() => downloadPDF(viewTest)}>
                  📄 Download PDF Result Sheet
                </Btn>
              </div>
              <Btn onClick={() => setViewTest(null)}>Close</Btn>
              <Btn variant="primary" onClick={() => { setViewTest(null); openMarkEntry(viewTest); }}>✏️ Edit Marks</Btn>
            </>
          }
        >
          {/* Summary */}
          {viewTest.students.filter(s=>s.marks_scored!==null&&s.marks_scored!==undefined).length > 0 && (() => {
            const done = viewTest.students.filter(s=>s.marks_scored!==null&&s.marks_scored!==undefined);
            const avg  = Math.round(done.reduce((a,s)=>a+parseFloat(s.marks_scored),0)/done.length * 10)/10;
            const highest = Math.max(...done.map(s=>parseFloat(s.marks_scored)));
            const lowest  = Math.min(...done.map(s=>parseFloat(s.marks_scored)));
            return (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:10,marginBottom:16 }}>
                {[
                  { label:'Entered', value:`${done.length}/${viewTest.students.length}`, color:'#2563eb' },
                  { label:'Average', value:`${avg}/${viewTest.total_marks}`, color:'#0f766e' },
                  { label:'Highest', value:highest, color:'#15803d' },
                  { label:'Lowest',  value:lowest,  color:lowest<(viewTest.total_marks*0.35)?'#dc2626':'#d97706' },
                ].map(s=>(
                  <div key={s.label} style={{ background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,padding:'10px 13px',textAlign:'center' }}>
                    <div style={{ fontSize:18,fontWeight:700,color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11,color:'#94a3b8',marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div style={{ border:'1px solid #e2e8f0',borderRadius:10,overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:600 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['#','Student','Class','Marks','Grade','%','Remarks'].map(h=>(
                    <th key={h} style={{ textAlign:'left',padding:'9px 13px',color:'#94a3b8',fontWeight:600,fontSize:11,borderBottom:'1px solid #e2e8f0',textTransform:'uppercase',letterSpacing:0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewTest.students.map((s,idx)=>{
                  const hasResult = s.marks_scored !== null && s.marks_scored !== undefined;
                  const pct = hasResult ? Math.round((parseFloat(s.marks_scored)/parseFloat(viewTest.total_marks))*100) : null;
                  return (
                    <tr key={s.student_id} style={{ borderBottom:'1px solid #f8fafc' }}>
                      <td style={{ padding:'10px 13px',color:'#94a3b8',fontWeight:600 }}>{idx+1}</td>
                      <td style={{ padding:'10px 13px' }}><div style={{ fontWeight:600 }}>{s.name}</div></td>
                      <td style={{ padding:'10px 13px' }}>
                        <span style={{ padding:'2px 8px',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:20,fontSize:11,fontWeight:600,color:'#0f766e',whiteSpace:'nowrap' }}>Class {s.class}</span>
                      </td>
                      <td style={{ padding:'10px 13px',fontWeight:700,color:hasResult?'#0f172a':'#94a3b8' }}>
                        {hasResult ? `${s.marks_scored} / ${viewTest.total_marks}` : '—'}
                      </td>
                      <td style={{ padding:'10px 13px' }}>
                        {s.grade
                          ? <span style={{ display:'inline-flex',padding:'3px 10px',background:gradeBg(s.grade),border:`1px solid ${gradeColor(s.grade)}44`,borderRadius:20,fontSize:12,fontWeight:700,color:gradeColor(s.grade) }}>{s.grade}</span>
                          : <span style={{ color:'#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding:'10px 13px',fontWeight:600,color:pct!==null?pctColor(pct):'#94a3b8' }}>
                        {pct !== null ? `${pct}%` : '—'}
                      </td>
                      <td style={{ padding:'10px 13px',color:'#64748b',fontSize:12 }}>{s.remarks||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* ══ DELETE CONFIRM ════════════════════════════════════════ */}
      {delTest && (
        <Modal title="Delete Test" onClose={()=>setDelTest(null)} size={420}
          footer={<><Btn onClick={()=>setDelTest(null)}>Cancel</Btn><Btn variant="danger" onClick={handleDelete}>Yes, Delete</Btn></>}>
          <p style={{ fontSize:13,color:'#475569',lineHeight:1.7 }}>
            Delete <strong style={{ color:'#0f172a' }}>{delTest.title}</strong>? This will permanently remove all marks entered for this test.
            <strong style={{ color:'#dc2626' }}> This cannot be undone.</strong>
          </p>
        </Modal>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

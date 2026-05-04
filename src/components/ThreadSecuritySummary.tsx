import React from 'react';
import { RiskBadge } from './RiskBadge';
import { Download, Shield, FileText, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { classifyThreadAttack, getAttackTypeDisplay } from '../lib/attackClassifier';
import type { ThreadSecuritySummary as ThreadSecuritySummaryType } from '../lib/types';

interface ThreadSecuritySummaryProps {
  summary: ThreadSecuritySummaryType;
  participantCount: number;
}

/**
 * Thread Security Summary - Shows overall thread threat assessment
 */
export const ThreadSecuritySummary: React.FC<ThreadSecuritySummaryProps> = ({
  summary,
  participantCount,
}) => {
  const attack = classifyThreadAttack(summary);
  const attackDisplay = getAttackTypeDisplay(attack.type);

  const highRiskCount = summary.emails.filter((e) => e.riskLevel === 'High').length;
  const mediumRiskCount = summary.emails.filter((e) => e.riskLevel === 'Medium').length;
  const lowRiskCount = summary.emails.filter((e) => e.riskLevel === 'Low').length;
  const trustedSignals = summary.trustedDomain || summary.confidenceLabel === 'High (Legitimate)';
  
  const recommendation = summary.overallRiskLevel === 'High'
    ? 'Immediate escalation required. Revoke session tokens and audit all links.'
    : summary.overallRiskLevel === 'Medium'
      ? 'Suspicious intent detected. Verify sender identity via secondary channel.'
      : 'Communication appears safe. standard monitoring applies.';

  const handleDownloadReport = () => {
    const reportData = JSON.stringify(summary, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Forensic_Report_${summary.threadId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500">
      {/* Premium Header */}
      <div className={cn(
        "px-10 py-10 flex flex-col lg:flex-row justify-between items-start gap-8 border-b border-[var(--border)]",
        summary.overallRiskLevel === 'High' ? "bg-red-500/5" : 
        summary.overallRiskLevel === 'Medium' ? "bg-amber-500/5" : "bg-emerald-500/5"
      )}>
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl shadow-lg",
              summary.overallRiskLevel === 'High' ? "bg-red-600 text-white" : 
              summary.overallRiskLevel === 'Medium' ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
            )}>
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60">Intelligence Forensic Report</span>
              <h2 className="text-3xl font-black tracking-tight mt-1">Thread Analysis</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1.5 rounded-lg bg-[var(--secondary)] text-[10px] font-black uppercase tracking-widest border border-[var(--border)]">
              ID: {summary.threadId.substring(0, 16)}...
            </span>
            {summary.attackType && (
              <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                {summary.attackType}
              </span>
            )}
            {trustedSignals && (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                Trusted Communication
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-6 shrink-0 w-full lg:w-auto">
          <div className="flex gap-3 w-full lg:w-auto">
            <button 
              onClick={handleDownloadReport}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--foreground)] text-[var(--background)] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
          <RiskBadge
            level={summary.overallRiskLevel}
            score={summary.overallRisk}
            size="lg"
            showScore={true}
          />
        </div>
      </div>

      <div className="p-10 space-y-10">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Threat Position" value={`${summary.overallRisk}/100`} subValue="Aggregate Risk Score" icon={AlertTriangle} />
          <StatCard label="Email Volume" value={summary.emails.length.toString()} subValue="Analyzed Messages" icon={FileText} />
          <StatCard label="Participant Count" value={participantCount.toString()} subValue="Identified Senders" icon={Info} />
          <StatCard label="Safety Rating" value={summary.overallRiskLevel === 'Low' ? 'A+' : 'C-'} subValue="Compliance Level" icon={CheckCircle} />
        </div>

        {/* Verdict Box */}
        <div className={cn(
          "p-8 rounded-3xl border-2 space-y-4",
          summary.overallRiskLevel === 'High' ? "border-red-500/30 bg-red-500/5" :
          summary.overallRiskLevel === 'Medium' ? "border-amber-500/30 bg-amber-500/5" :
          "border-emerald-500/30 bg-emerald-500/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-8 rounded-full",
              summary.overallRiskLevel === 'High' ? "bg-red-500" :
              summary.overallRiskLevel === 'Medium' ? "bg-amber-500" : "bg-emerald-500"
            )} />
            <h3 className="text-xl font-black tracking-tight uppercase">Executive Verdict</h3>
          </div>
          <p className="text-lg font-bold leading-relaxed opacity-90">{summary.threadThreatLevel}</p>
          <div className="pt-4 border-t border-[var(--border)] opacity-80">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Analyst Recommendation</p>
            <p className="font-semibold text-sm">{recommendation}</p>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Risk Distribution Profile</h3>
            <span className="text-[10px] font-bold opacity-60">{summary.emails.length} samples analyzed</span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-[var(--secondary)] shadow-inner">
            {lowRiskCount > 0 && <div className="bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" style={{ width: `${(lowRiskCount / summary.emails.length) * 100}%` }} />}
            {mediumRiskCount > 0 && <div className="bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]" style={{ width: `${(mediumRiskCount / summary.emails.length) * 100}%` }} />}
            {highRiskCount > 0 && <div className="bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]" style={{ width: `${(highRiskCount / summary.emails.length) * 100}%` }} />}
          </div>
          <div className="flex gap-6 pt-2">
            <DistributionLabel label="Low" count={lowRiskCount} color="bg-emerald-500" />
            <DistributionLabel label="Medium" count={mediumRiskCount} color="bg-amber-500" />
            <DistributionLabel label="High" count={highRiskCount} color="bg-red-500" />
          </div>
        </div>

        {/* Suspicious Event Marker */}
        {summary.firstSuspiciousEmailIndex !== undefined && (
          <div className="flex items-center gap-6 p-6 rounded-2xl bg-red-600 text-white shadow-xl shadow-red-500/20">
            <div className="shrink-0 p-3 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Primary Breach Point</p>
              <p className="text-lg font-black tracking-tight mt-0.5">
                First suspicious activity detected at Position #{summary.firstSuspiciousEmailIndex + 1}
              </p>
              <p className="text-xs font-medium opacity-70 mt-1">Identifier: {summary.firstSuspiciousEmailId || "Unknown"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subValue, icon: Icon }: { label: string, value: string, subValue: string, icon: any }) => (
  <div className="p-6 rounded-3xl bg-[var(--secondary)]/50 border border-[var(--border)] hover:border-primary-500/30 transition-all group">
    <div className="flex items-center justify-between mb-4">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">{label}</span>
      <Icon className="w-4 h-4 opacity-40 group-hover:text-primary-600 transition-all" />
    </div>
    <p className="text-3xl font-black tracking-tight">{value}</p>
    <p className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-wider">{subValue}</p>
  </div>
);

const DistributionLabel = ({ label, count, color }: { label: string, count: number, color: string }) => (
  <div className="flex items-center gap-2">
    <div className={cn("w-2 h-2 rounded-full", color)} />
    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
    <span className="text-[10px] font-black">{count}</span>
  </div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default ThreadSecuritySummary;

"use client";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();
  return (
    <div style={{minHeight:"100vh",background:"#0B0D10",color:"#F0F0F2",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10}a{color:#0B9635}`}</style>

      <header style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",borderBottom:"1px solid #151820",background:"#0B0D10F0",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90}}>
        <div style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onClick={() => router.back()}>
          <span style={{fontSize:18,color:"#888"}}>{"\u2190"}</span>
          <img src="/pego-logo.png" alt="BG" style={{height:40,width:"auto"}} />
        </div>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,marginLeft:"auto"}}>Terms of Service</span>
      </header>

      <main style={{maxWidth:640,margin:"0 auto",padding:"32px 20px"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:2,marginBottom:8}}>Terms of Service</div>
        <p style={{fontSize:12,color:"#555",marginBottom:28}}>Last updated: March 2026</p>

        {[
          { title: "1. Acceptance of Terms", body: "By accessing and using BetGenius AI (\"the Platform\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the Platform. You must be at least 18 years old to use our services." },
          { title: "2. Service Description", body: "BetGenius AI provides expert football prediction analysis for entertainment and informational purposes. Our predictions cover EPL, La Liga, Serie A, and Bundesliga. Predictions are delivered in rounds through our Gold, Platinum, and Diamond subscription packages." },
          { title: "3. Account Registration", body: "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Each person may only register one account." },
          { title: "4. Subscription Packages", body: "We offer three subscription tiers: Gold ($40), Platinum ($80), and Diamond ($160). Each package includes 3 prediction rounds and is valid for 30 days from activation. Packages are activated after admin approval of payment. Package features and pricing may change without prior notice." },
          { title: "5. Payment Terms", body: "Payments are accepted via Bitcoin (BTC), USDT (TRC20), and Mobile Money (MoMo). All payments must be submitted through the Platform and are subject to admin verification before package activation. Processing times may vary." },
          { title: "6. Predictions Disclaimer", body: "All predictions provided are for informational and entertainment purposes only. BetGenius AI does not guarantee the accuracy of any prediction. Past performance is not indicative of future results. You acknowledge that sports betting involves risk and you are solely responsible for your betting decisions." },
          { title: "7. No Financial Advice", body: "Nothing on this Platform constitutes financial, investment, or betting advice. We do not encourage or endorse gambling. Users should only bet with money they can afford to lose. If you have a gambling problem, please seek professional help." },
          { title: "8. Referral Program", body: "Users may earn referral bonuses by inviting new users with their unique referral code. Referral bonuses are credited after the referred user is approved. Abuse of the referral system (including self-referrals or fake accounts) will result in account termination and forfeiture of earnings." },
          { title: "9. Refund Policy", body: "Refunds may be considered on a case-by-case basis within 24 hours of payment if your package has not yet been activated. Once a package is activated and predictions have been delivered, no refunds will be issued. Contact support for refund requests." },
          { title: "10. Prohibited Conduct", body: "You may not: share your account credentials, redistribute our predictions commercially, use automated tools to scrape content, create multiple accounts, engage in fraudulent activity, or attempt to reverse-engineer our prediction systems." },
          { title: "11. Intellectual Property", body: "All content on the Platform, including predictions, analysis, branding, and design, is the property of BetGenius AI. You may not reproduce, distribute, or create derivative works without our explicit written permission." },
          { title: "12. Account Termination", body: "We reserve the right to suspend or terminate your account at any time for violation of these terms or for any reason at our sole discretion. Upon termination, your access to the Platform and any remaining package credits will be revoked." },
          { title: "13. Limitation of Liability", body: "BetGenius AI shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the Platform or reliance on our predictions. Our maximum liability is limited to the amount you paid for your current subscription package." },
          { title: "14. Changes to Terms", body: "We may update these Terms of Service at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms. We encourage you to review this page periodically." },
          { title: "15. Contact", body: "For questions about these Terms, contact us at support@betgenius.ai or via WhatsApp." },
        ].map(s => (
          <div key={s.title} style={{marginBottom:24}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,marginBottom:8,color:"#0B9635"}}>{s.title}</div>
            <p style={{fontSize:14,color:"#888",lineHeight:1.8}}>{s.body}</p>
          </div>
        ))}

        <div style={{borderTop:"1px solid #151820",paddingTop:20,marginTop:12,textAlign:"center"}}>
          <p style={{fontSize:12,color:"#333"}}>© 2026 BetGenius AI. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}

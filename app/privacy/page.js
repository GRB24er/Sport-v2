"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{minHeight:"100vh",background:"#0B0D10",color:"#F0F0F2",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10}a{color:#0B9635}`}</style>

      <header style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",borderBottom:"1px solid #151820",background:"#0B0D10F0",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90}}>
        <div style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onClick={() => router.back()}>
          <span style={{fontSize:18,color:"#888"}}>{"\u2190"}</span>
          <img src="/images/logo.png" alt="BG" style={{height:40,width:"auto"}} />
        </div>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,marginLeft:"auto"}}>Privacy Policy</span>
      </header>

      <main style={{maxWidth:640,margin:"0 auto",padding:"32px 20px"}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:2,marginBottom:8}}>Privacy Policy</div>
        <p style={{fontSize:12,color:"#555",marginBottom:28}}>Last updated: March 2026</p>

        {[
          { title: "1. Information We Collect", body: "We collect information you provide during registration including your name, phone number, email address, and payment details. We also collect usage data such as prediction history, package subscriptions, and referral activity." },
          { title: "2. How We Use Your Information", body: "Your information is used to: provide and manage your account, process subscription payments, deliver predictions, manage the referral program, send important notifications, and improve our services." },
          { title: "3. Data Storage & Security", body: "Your data is stored securely using industry-standard encryption. Passwords are hashed using bcrypt. We use MongoDB Atlas with encrypted connections. We implement reasonable security measures to protect your personal information from unauthorized access." },
          { title: "4. Payment Information", body: "We record payment transaction details (amount, method, reference) for verification purposes. We do not store complete cryptocurrency wallet keys or Mobile Money PINs. Payment verification is handled by our admin team." },
          { title: "5. Information Sharing", body: "We do not sell, trade, or rent your personal information to third parties. We may share information only: with your consent, to comply with legal obligations, to protect our rights, or with service providers necessary to operate the Platform." },
          { title: "6. Cookies & Tracking", body: "We use session cookies for authentication purposes. We do not use third-party advertising trackers. Analytics data may be collected in aggregate form to improve service quality." },
          { title: "7. Data Retention", body: "We retain your account data for as long as your account is active. Prediction history is retained for service improvement. You may request deletion of your account and associated data by contacting support." },
          { title: "8. Your Rights", body: "You have the right to: access your personal data, correct inaccurate information, request deletion of your data, and withdraw consent for data processing. To exercise these rights, contact us at support@betgenius.ai." },
          { title: "9. Age Requirement", body: "Our services are restricted to users aged 18 and above. We do not knowingly collect information from individuals under 18. If we discover such data has been collected, it will be promptly deleted." },
          { title: "10. Third-Party Links", body: "Our Platform may contain links to external websites or betting platforms. We are not responsible for the privacy practices of these third-party sites. We encourage you to review their privacy policies." },
          { title: "11. Changes to This Policy", body: "We may update this Privacy Policy periodically. Changes will be posted on this page with an updated revision date. Continued use of the Platform constitutes acceptance of the updated policy." },
          { title: "12. Contact Us", body: "For privacy-related inquiries, contact us at support@betgenius.ai or via WhatsApp. We aim to respond to all privacy requests within 48 hours." },
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

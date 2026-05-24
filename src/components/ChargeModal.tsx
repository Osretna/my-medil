import React, { useState, useId } from 'react';
import { Transaction } from '../types';
import { PAYMENT_PACKAGES, synths } from '../gameData';
import { CreditCard, Copy, Check, MessageCircle, AlertCircle, Coins, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';

interface ChargeModalProps {
  userId: string;
  userEmail: string;
  onNewTransaction: (t: Transaction) => void;
  onClose: () => void;
}

export default function ChargeModal({ userId, userEmail, onNewTransaction, onClose }: ChargeModalProps) {
  const [selectedPkg, setSelectedPkg] = useState(PAYMENT_PACKAGES[0]);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transactionNote, setTransactionNote] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const phoneInputId = useId();
  const noteInputId = useId();

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('01120194940');
    setCopied(true);
    synths.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderPhone) return;

    setSubmitting(true);
    synths.playClick();

    // Fabricate the Transaction
    const tx: Transaction = {
      id: `TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      userEmail,
      amountEGP: selectedPkg.egp,
      coinsGranted: selectedPkg.coins,
      instapayPhone: '01120194940 (InstaPay)',
      status: 'pending',
      whatsappRef: `رقم المحول: ${senderPhone}. ملاحظة: ${transactionNote}`,
      createdAt: new Date().toISOString()
    };

    setTimeout(() => {
      onNewTransaction(tx);
      setSubmitting(false);
      setSubmitted(true);
      synths.playLevelUp();
    }, 1000);
  };

  // Generate WhatsApp Direct Link
  const getWhatsAppLink = () => {
    const message = `أهلاً بك، لقد قمت بتحويل مبلغ ${selectedPkg.egp} جنيه عبر انستا باي للرقم 01120194940 لشحن ${selectedPkg.coins} عملة ذهبية في لعبة الحرب ثلاثية الأبعاد.\n\nالبريد الإلكتروني للّاعب: ${userEmail}\nرقم المحفظة المحول منها: ${senderPhone}\nملاحظة: ${transactionNote}`;
    return `https://wa.me/201120194940?text=${encodeURIComponent(message)}`;
  };

  return (
    <div id="charge_modal_backdrop" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div id="charge_modal_content" className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 text-right">
          <button
            id="close_charge_modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition cursor-pointer"
          >
            إغلاق ×
          </button>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl font-bold text-white">شحن باقات الذهب التكتيكية</h3>
            <Coins className="w-6 h-6 text-yellow-500 animate-pulse" />
          </div>
        </div>

        {submitted ? (
          /* Success Screen with WhatsApp Button */
          <div className="p-8 text-center flex flex-col items-center justify-center animate-fade-in text-slate-100">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
              <ShieldCheck className="w-10 h-10 animate-bounce" />
            </div>
            <h4 className="text-2xl font-black text-white mb-2">تم تسجيل طلب الشحن بنجاح!</h4>
            <p className="text-slate-400 text-sm max-w-md mb-6 leading-6">
              لتفعيل طلبك وبدء مغامرتك فورًا، يجب عليك تأكيد عملية الدفع عن طريق واتساب بإرسال لقطة الشاشة (Screenshot) للتحويل.
            </p>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl text-right w-full mb-6">
              <div className="flex justify-between border-b border-slate-800/60 pb-2.5 mb-2.5 text-xs text-slate-400">
                <span>{selectedPkg.labelAr}</span>
                <span className="font-bold text-white">الباقة المشتراة</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2.5 mb-2.5 text-xs text-slate-400">
                <span>{selectedPkg.egp} جنيه مصري</span>
                <span className="font-bold text-white">القيمة المطلوبة</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>+{selectedPkg.coins} عملة ذهبية 🪙</span>
                <span className="font-bold text-yellow-400">الذهب المقرر إضافته</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <a
                id="whatsapp_confirm_link"
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition duration-200 flex items-center justify-center gap-2 text-center shadow-lg"
              >
                <MessageCircle className="w-5 h-5 animate-pulse" />
                تأكيد الدفع عبر واتساب الآن 🟢
              </a>
              <button
                id="primary_done_btn"
                onClick={onClose}
                className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition cursor-pointer"
              >
                العودة للعبة
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Quick alert */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-right">
              <div className="text-amber-500 mt-1">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs text-slate-300 leading-normal">
                <span className="font-bold text-amber-500">ملاحظة هامة:</span> يتم الدفع بالتحويل لعنوان إنستا باي الشخصي، ويتم ترقية الحساب تلقائياً بمجرد إرسال لقطة الشاشة. نضمن لك تفعيلاً آمناً بنسبة 100%.
              </div>
            </div>

            {/* Step 1: Selector Packages */}
            <div>
              <span className="text-sm font-bold text-slate-400 block mb-3 text-right">الخطوة 1: اختر باقة الذهب المناسبة</span>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_PACKAGES.map((pkg) => (
                  <button
                    id={`package_opt_${pkg.id}`}
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPkg(pkg);
                      synths.playClick();
                    }}
                    className={`p-4 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      selectedPkg.id === pkg.id
                        ? 'border-yellow-500 bg-yellow-500/5 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xl">{pkg.icon}</span>
                      <span className="text-sm font-bold text-white">{pkg.labelAr}</span>
                    </div>
                    <div className="mt-4 flex justify-between items-baseline w-full">
                      <span className="text-xs text-slate-500">تحصيل {pkg.coins} 🪙</span>
                      <span className="text-lg font-black text-yellow-500">{pkg.egp} ج.م</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Pay to InstaPay Detail */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <span className="text-sm font-bold text-yellow-500 block">الخطوة 2: حول قيمة الباقة لـ InstaPay ⚡</span>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded bg-slate-800 border border-slate-700">
                    <QrCode className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="text-slate-300">
                    <span className="block text-xs text-slate-500">رقم المحمول (انستا باي)</span>
                    <span className="font-mono font-bold text-white text-lg">01120194940</span>
                  </div>
                </div>
                
                <button
                  id="copy_instapay_num"
                  type="button"
                  onClick={handleCopyPhone}
                  className="px-4 py-2 bg-slate-800 text-xs text-indigo-400 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      نسخ الرقم للتحويل
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-normal">
                افتح تطبيق <span className="text-indigo-400 font-bold">InstaPay</span> على هاتفك، اختر التحويل لرقم المحمول، أدخل القيمة المختارة (<span className="text-yellow-500 font-bold">{selectedPkg.egp} ج.م</span>)، ثم تمم المعركة ورُد لملء نموذج التأكيد أدناه.
              </p>
            </div>

            {/* Step 3: Fill Transaction details for instant submission */}
            <form onSubmit={handleSubmitTransaction} className="space-y-4 text-right">
              <span className="text-sm font-bold text-slate-400 block">الخطوة 3: املأ تفاصيل التحويل لإرسال الطلب</span>
              
              <div className="space-y-1.5">
                <label htmlFor={phoneInputId} className="block text-xs font-bold text-slate-300">رقم المحفظة / الحساب الذي قمت بالتحويل منه *</label>
                <input
                  id={phoneInputId}
                  type="text"
                  required
                  placeholder="مثال: 011xxxxxxxx"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 p-3 rounded-lg text-sm text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={noteInputId} className="block text-xs font-bold text-slate-300">ملاحظات التحويل أو رمز المعاملة (إختياري)</label>
                <input
                  id={noteInputId}
                  type="text"
                  placeholder="مثال: تم التحويل الساعة 12 ظهراً باسم محمد..."
                  value={transactionNote}
                  onChange={(e) => setTransactionNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 p-3 rounded-lg text-sm text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  id="cancel_charge_btn"
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer text-center"
                >
                  إلغاء
                </button>
                <button
                  id="submit_charge_form_btn"
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl transition cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <CreditCard className="w-4 h-4" />
                  {submitting ? 'جاري الإرسال...' : 'إرسال طلب التفعيل ⚡'}
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}

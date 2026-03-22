"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Banknote,
  DollarSign,
  Loader2,
  Save,
  Eye,
  EyeOff,
  CreditCard,
  Building2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";

interface PaymentConfigData {
  cashEnabled: boolean;
  esewaEnabled: boolean;
  khaltiEnabled: boolean;
  bankEnabled: boolean;
  esewaMerchantCode: string;
  esewaSecretKey: string;
  khaltiSecretKey: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  counterPayEnabled: boolean;
  directPayEnabled: boolean;
  prepaidEnabled: boolean;
}

const DEFAULT_CONFIG: PaymentConfigData = {
  cashEnabled: true,
  esewaEnabled: false,
  khaltiEnabled: false,
  bankEnabled: false,
  esewaMerchantCode: "",
  esewaSecretKey: "",
  khaltiSecretKey: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankBranch: "",
  counterPayEnabled: false,
  directPayEnabled: false,
  prepaidEnabled: false,
};

export default function PaymentSettingsTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [config, setConfig] = useState<PaymentConfigData>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const fetchConfig = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<PaymentConfigData>(
        `/api/restaurants/${restaurant.id}/payment-config`,
      );
      // Merge restaurant-level payment flags
      setConfig({
        ...data,
        counterPayEnabled: restaurant.counterPayEnabled ?? false,
        directPayEnabled: restaurant.directPayEnabled ?? false,
        prepaidEnabled: restaurant.prepaidEnabled ?? false,
      });
    } catch {
      showToast("Failed to load payment settings", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, restaurant?.counterPayEnabled, restaurant?.directPayEnabled, restaurant?.prepaidEnabled]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...config };
      // Don't send masked values back
      if (config.esewaMerchantCode === "••••••")
        delete payload.esewaMerchantCode;
      if (config.esewaSecretKey === "••••••") delete payload.esewaSecretKey;
      if (config.khaltiSecretKey === "••••••") delete payload.khaltiSecretKey;
      // Remove restaurant-level flags from payment config payload
      delete payload.counterPayEnabled;
      delete payload.directPayEnabled;
      delete payload.prepaidEnabled;

      // Save payment config
      const updated = await apiFetch<PaymentConfigData>(
        `/api/restaurants/${restaurant.id}/payment-config`,
        { method: "PATCH", body: payload },
      );

      // Save restaurant-level payment flags
      await apiFetch(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        body: {
          counterPayEnabled: config.counterPayEnabled,
          directPayEnabled: config.directPayEnabled,
          prepaidEnabled: config.prepaidEnabled,
        },
      });

      setConfig({
        ...updated,
        counterPayEnabled: config.counterPayEnabled,
        directPayEnabled: config.directPayEnabled,
        prepaidEnabled: config.prepaidEnabled,
      });
      showToast("Payment settings saved!");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (field: keyof PaymentConfigData, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-amber-950">Payment Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure which payment methods customers can use and enter your
          gateway credentials.
        </p>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          API keys and bank details are encrypted before storage. They are never
          exposed in full after saving.
        </p>
      </div>

      {/* ─── Cash ─────────────────────────────────────────── */}
      <PaymentSection
        title="Cash (Pay at Counter)"
        description="Accept cash payments at the counter"
        icon={<DollarSign className="h-5 w-5" />}
        color="gray"
        enabled={config.cashEnabled}
        onToggle={(v) => updateField("cashEnabled", v)}
      />

      {/* ─── eSewa ────────────────────────────────────────── */}
      <PaymentSection
        title="eSewa"
        description="Accept eSewa digital wallet payments"
        icon={<Wallet className="h-5 w-5" />}
        color="green"
        enabled={config.esewaEnabled}
        onToggle={(v) => updateField("esewaEnabled", v)}
      >
        <SecretField
          label="Merchant Code"
          value={config.esewaMerchantCode}
          onChange={(v) => updateField("esewaMerchantCode", v)}
          show={showSecrets["esewaMerchantCode"]}
          onToggleShow={() => toggleSecret("esewaMerchantCode")}
          placeholder="e.g. EPAYTEST"
        />
        <SecretField
          label="Secret Key"
          value={config.esewaSecretKey}
          onChange={(v) => updateField("esewaSecretKey", v)}
          show={showSecrets["esewaSecretKey"]}
          onToggleShow={() => toggleSecret("esewaSecretKey")}
          placeholder="Your eSewa secret key"
        />
        {config.esewaEnabled &&
          (!config.esewaMerchantCode || !config.esewaSecretKey) && (
            <CredentialWarning method="eSewa" />
          )}
      </PaymentSection>

      {/* ─── Khalti ───────────────────────────────────────── */}
      <PaymentSection
        title="Khalti"
        description="Accept Khalti digital wallet payments"
        icon={<CreditCard className="h-5 w-5" />}
        color="purple"
        enabled={config.khaltiEnabled}
        onToggle={(v) => updateField("khaltiEnabled", v)}
      >
        <SecretField
          label="Secret Key"
          value={config.khaltiSecretKey}
          onChange={(v) => updateField("khaltiSecretKey", v)}
          show={showSecrets["khaltiSecretKey"]}
          onToggleShow={() => toggleSecret("khaltiSecretKey")}
          placeholder="Your Khalti secret key"
        />
        {config.khaltiEnabled && !config.khaltiSecretKey && (
          <CredentialWarning method="Khalti" />
        )}
      </PaymentSection>

      {/* ─── Counter Pay ──────────────────────────────────── */}
      <PaymentSection
        title="Counter Pay"
        description="Customers pay at counter after ordering"
        icon={<Banknote className="h-5 w-5" />}
        color="gray"
        enabled={config.counterPayEnabled}
        onToggle={(v) => updateField("counterPayEnabled", v)}
      />

      {/* ─── Direct Pay ───────────────────────────────────── */}
      <PaymentSection
        title="Direct Pay"
        description="Accept direct payments (Fonepay, QR, etc.)"
        icon={<CreditCard className="h-5 w-5" />}
        color="blue"
        enabled={config.directPayEnabled}
        onToggle={(v) => updateField("directPayEnabled", v)}
      />

      {/* ─── Prepaid System ───────────────────────────────── */}
      <PaymentSection
        title="Prepaid / Token System"
        description="Customers pay first, get token, food is processed after payment"
        icon={<ShieldCheck className="h-5 w-5" />}
        color="green"
        enabled={config.prepaidEnabled}
        onToggle={(v) => updateField("prepaidEnabled", v)}
      />

      {/* ─── Bank Transfer ────────────────────────────────── */}
      <PaymentSection
        title="Bank Transfer"
        description="Accept bank / mobile banking payments"
        icon={<Building2 className="h-5 w-5" />}
        color="blue"
        enabled={config.bankEnabled}
        onToggle={(v) => updateField("bankEnabled", v)}
      >
        <div className="space-y-3">
          <InputField
            label="Bank Name"
            value={config.bankName}
            onChange={(v) => updateField("bankName", v)}
            placeholder="e.g. Nepal Bank Limited"
          />
          <InputField
            label="Account Holder Name"
            value={config.bankAccountName}
            onChange={(v) => updateField("bankAccountName", v)}
            placeholder="e.g. Restaurant Pvt. Ltd."
          />
          <InputField
            label="Account Number"
            value={config.bankAccountNumber}
            onChange={(v) => updateField("bankAccountNumber", v)}
            placeholder="Your bank account number"
          />
          <InputField
            label="Branch"
            value={config.bankBranch}
            onChange={(v) => updateField("bankBranch", v)}
            placeholder="e.g. Kathmandu"
          />
        </div>
        {config.bankEnabled && !config.bankAccountNumber && (
          <CredentialWarning method="Bank Transfer" />
        )}
      </PaymentSection>

      {/* Save Button */}
      <div className="pt-2 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-amber-700 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Payment Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function PaymentSection({
  title,
  description,
  icon,
  color,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
  };

  return (
    <motion.div
      layout
      className={`rounded-2xl border-2 overflow-hidden transition-colors ${
        enabled ? colorMap[color] || colorMap.gray : "border-gray-100 bg-white"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              enabled
                ? colorMap[color] || colorMap.gray
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            enabled ? "bg-amber-700" : "bg-gray-300"
          }`}
        >
          <motion.div
            layout
            className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
            style={{ left: enabled ? "calc(100% - 1.625rem)" : "0.125rem" }}
          />
        </button>
      </div>
      {enabled && children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200/50 px-5 py-4 bg-white/80 space-y-3"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

function SecretField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
}) {
  const isMasked = value === "••••••";

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={isMasked ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isMasked ? "••••••  (saved — enter new to update)" : placeholder
          }
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm text-amber-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/30"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 py-2.5 px-4 text-sm text-amber-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400/30"
      />
    </div>
  );
}

function CredentialWarning({ method }: { method: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mt-2">
      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <p className="text-[11px] text-amber-700">
        {method} is enabled but credentials are missing. Customers won&apos;t
        see this option until credentials are saved.
      </p>
    </div>
  );
}

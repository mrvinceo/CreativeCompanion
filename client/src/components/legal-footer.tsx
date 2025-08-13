import { ExternalLink } from 'lucide-react';

interface LegalFooterProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export function LegalFooter({ className = "", variant = 'dark' }: LegalFooterProps) {
  const isDark = variant === 'dark';
  const textColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const linkColor = isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900';
  const separatorColor = isDark ? 'text-gray-600' : 'text-gray-400';
  
  const legalDocuments = [
    { name: 'Privacy Policy', path: '/attached_assets/Refyn_Privacy_Policy_1755113104491.pdf' },
    { name: 'Terms of Service', path: '/attached_assets/Refyn_Terms_of_service_1755113104517.pdf' },
    { name: 'Cookie Policy', path: '/attached_assets/Refyn_Cookie_policy_1755113104357.pdf' },
    { name: 'Data Retention', path: '/attached_assets/Refyn_Data_retention_schedule_1755113104423.pdf' },
    { name: 'Legal Notice', path: '/attached_assets/Refyn_Legal_notice_1755113104456.pdf' },
    { name: 'Accessibility', path: '/attached_assets/Refyn_Accessibility_statement_1755113102762.pdf' }
  ];

  return (
    <footer className={`py-6 px-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Legal Documents Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          {legalDocuments.map((doc, index) => (
            <div key={doc.name} className="flex items-center">
              <a
                href={doc.path}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkColor} hover:underline text-sm font-medium transition-colors duration-200 flex items-center gap-1`}
              >
                {doc.name}
                <ExternalLink className="w-3 h-3" />
              </a>
              {index < legalDocuments.length - 1 && (
                <span className={`mx-3 ${separatorColor}`}>•</span>
              )}
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className={`text-center ${textColor}`}>
          <p className="text-sm">© 2025 Refyn - Operated by Paul Vincent. All rights reserved.</p>
          <p className="text-xs mt-1">
            By using this service, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </footer>
  );
}
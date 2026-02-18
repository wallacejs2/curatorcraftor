/**
 * @license
 * Copyright Wallace, Jayden
 * SPDX-License-Identifier: Apache-2.0
 */
import DOMPurify from 'dompurify';

interface DesignSettings {
  fontFamily: string;
  buttonStyle: string;
  offersLayout: 'list' | 'grid';
}

interface SavedTemplate {
    id: string;
    name: string;
    createdAt: string;
    designSettings: DesignSettings;
    components: EmailComponent[];
}

interface EmailComponent {
    id: string;
    type: string;
    data: Record<string, string>;
}

interface MergeFieldItem {
  label: string;
  value: string;
}

interface MergeFieldGroup {
  title: string;
  items?: MergeFieldItem[];
  subgroups?: { title: string; items: MergeFieldItem[] }[];
}

interface ActiveField {
    componentId: string;
    fieldKey: string;
    fieldLabel: string;
    element: HTMLElement;
    subOfferIndex?: number;
}

// --- START: Keyboard Shortcut System Interfaces & State ---
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: 'General' | 'Editing' | 'Navigation' | 'Components';
  action: (event: KeyboardEvent) => void;
  condition?: () => boolean;
}

interface CommandHistoryState {
  designSettings: DesignSettings;
  activeComponents: EmailComponent[];
  timestamp: number;
}

let commandHistory: CommandHistoryState[] = [];
let commandHistoryIndex: number = -1;
const MAX_HISTORY_SIZE = 50;

let selectedComponentId: string | null = null;
let shortcuts: KeyboardShortcut[] = [];
let shortcutsModal: HTMLElement | null = null;
let shortcutsModalOverlay: HTMLElement | null = null;
// --- END: Keyboard Shortcut System Interfaces & State ---


const MERGE_FIELDS: MergeFieldGroup[] = [
  {
    title: "Recipient Details",
    items: [
      { label: "First Name", value: "{{recipient.first_name}}" },
      { label: "Last Name", value: "{{recipient.last_name}}" },
      { label: "Email", value: "{{recipient.email}}" }
    ]
  },
  {
    title: "Last Transaction Vehicle",
    items: [
      { label: "Equity State", value: "{{customer.last_transaction.vehicle.equity_payout_formatted}}" },
      { label: "Year", value: "{{customer.last_transaction.vehicle.year}}" },
      { label: "Make", value: "{{customer.last_transaction.vehicle.make}}" },
      { label: "Model", value: "{{customer.last_transaction.vehicle.model}}" },
      { label: "Trim", value: "{{customer.last_transaction.vehicle.trim}}" },
      { label: "VIN", value: "{{customer.last_transaction.vehicle.vin}}" },
      { label: "Mileage", value: "{{customer.last_transaction.vehicle.mileage}}" }
    ]
  },
  {
    title: "Trade-in Estimates",
    items: [
      { label: "Fair Condition", value: "{{customer.owned_vehicle.estimated_trade_in_fair_formatted}}" },
      { label: "Good Condition", value: "{{customer.owned_vehicle.estimated_trade_in_good_formatted}}" },
      { label: "Very Good Condition", value: "{{customer.owned_vehicle.estimated_trade_in_very_good_formatted}}" },
      { label: "Excellent Condition", value: "{{customer.owned_vehicle.estimated_trade_in_excellent_formatted}}" }
    ]
  },
  {
    title: "Recall Details",
    items: [
      { label: "Recall ID", value: "{{customer.last_sold_vehicle.recall_campaign_number}}" },
      { label: "Recall Description", value: "{{customer.last_sold_vehicle.recall_description}}" }
    ]
  },
  {
    title: "Dealer Details",
    items: [
      { label: "Dealership Name", value: "{{dealership.name}}" },
      { label: "Dealership Phone", value: "{{dealership.phone_number}}" },
      { label: "Dealership Address", value: "{{dealership.address}}" },
      { label: "Sales Rep Name", value: "{{dealership.sales.representative.name}}" },
      { label: "Sales Rep Title", value: "{{dealership.sales.representative.title}}" }
    ]
  },
  {
    title: "Website Links",
    subgroups: [
      {
        title: "Homepage",
        items: [
          { label: "Homepage URL (LP)", value: "{{dealership.tracked_website_homepage_url}}" },
          { label: "Homepage URL (No LP)", value: "{{dealership.tracked_website_homepage_no_lp_url}}" }
        ]
      },
      {
        title: "Specials",
        items: [
          { label: "Specials Page (LP)", value: "{{dealership.tracked_website_specials_url}}" },
          { label: "Specials Page (No LP)", value: "{{dealership.tracked_website_specials_no_lp_url}}" }
        ]
      },
      {
        title: "Trade-In",
        items: [
          { label: "Trade-In Value (LP)", value: "{{dealership.tracked_website_vehicle_acquisition_url}}" },
          { label: "Trade-In Value (No LP)", value: "{{dealership.tracked_website_vehicle_acquisition_no_lp_url}}" }
        ]
      },
      {
        title: "Service",
        items: [
          { label: "Service Page (LP)", value: "{{dealership.tracked_website_service_url}}" },
          { label: "Service Page (No LP)", value: "{{dealership.tracked_website_service_no_lp_url}}" },
          { label: "Service Specials (LP)", value: "{{dealership.tracked_website_service_specials_url}}" },
          { label: "Service Specials (No LP)", value: "{{dealership.tracked_website_service_specials_no_lp_url}}" },
          { label: "Service Scheduler (LP)", value: "{{dealership.tracked_website_service_scheduler_url}}" },
          { label: "Service Scheduler (No LP)", value: "{{dealership.tracked_website_service_scheduler_no_lp_url}}" },
          { label: "Service Reviews (LP)", value: "{{dealership.tracked_website_service_customer_reviews_url}}" },
          { label: "Service Reviews (No LP)", value: "{{dealership.tracked_website_service_customer_reviews_no_lp_url}}" }
        ]
      },
      {
        title: "Other Pages",
        items: [
          { label: "Accessories (LP)", value: "{{dealership.tracked_website_accessories_url}}" },
          { label: "Accessories (No LP)", value: "{{dealership.tracked_website_accessories_no_lp_url}}" },
          { label: "Body Shop (LP)", value: "{{dealership.tracked_website_body_shop_url}}" },
          { label: "Body Shop (No LP)", value: "{{dealership.tracked_website_body_shop_no_lp_url}}" },
          { label: "Parts Page (LP)", value: "{{dealership.tracked_website_parts_url}}" },
          { label: "Parts Page (No LP)", value: "{{dealership.tracked_website_parts_no_lp_url}}" },
          { label: "Tires Page (LP)", value: "{{dealership.tracked_website_tires_url}}" },
          { label: "Tires Page (No LP)", value: "{{dealership.tracked_website_tires_no_lp_url}}" }
        ]
      }
    ]
  }
];

// Application State
let designSettings: DesignSettings = {
  fontFamily: "'Arial', sans-serif",
  buttonStyle: 'rounded',
  offersLayout: 'list'
};

let activeComponents: EmailComponent[] = [];
let activeField: ActiveField | null = null;
let collapsedStates: Record<string, boolean> = {};
let draggedComponentId: string | null = null;

// DOM Elements
const emailForm = document.getElementById('email-form') as HTMLFormElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const outputContainer = document.getElementById('output-container') as HTMLElement;
const outputPlaceholder = document.getElementById('output-placeholder') as HTMLElement;
const previewPane = document.getElementById('preview-pane') as HTMLIFrameElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const componentsContainer = document.getElementById('form-components-container') as HTMLElement;
const addComponentBtn = document.getElementById('add-component-btn') as HTMLButtonElement;

// Sidebar & Picker elements
const designSidebar = document.getElementById('design-sidebar');
const dynamicStylingContainer = document.getElementById('dynamic-styling-container');
const mergeFieldsSidebar = document.getElementById('merge-fields-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const designSidebarOverlay = document.getElementById('design-sidebar-overlay');
const componentPickerOverlay = document.getElementById('component-picker-overlay');
const closeComponentPicker = document.getElementById('close-component-picker');

// Toggle buttons
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mergeFieldsToggle = document.getElementById('merge-fields-toggle');
const floatingMergeBtn = document.getElementById('floating-merge-btn');

// View Toggles
const desktopViewBtn = document.getElementById('desktop-view-btn');
const mobileViewBtn = document.getElementById('mobile-view-btn');

// Close buttons
const closeDesignSidebar = document.getElementById('close-design-sidebar');
const closeMergeSidebar = document.getElementById('close-sidebar');

// Design Settings Controls
const fontSelect = document.getElementById('design-font-family') as HTMLSelectElement;

// Saved Template Elements
const saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
const savedTemplatesList = document.getElementById('saved-templates-list') as HTMLElement;

const ALIGNMENT_ICONS = {
    left: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>`,
    center: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="7" y2="18"></line></svg>`,
    right: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>`
};

// Toast Notification
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    let toastWrapper = document.getElementById('toast-wrapper');
    if (!toastWrapper) {
        toastWrapper = document.createElement('div');
        toastWrapper.id = 'toast-wrapper';
        toastWrapper.className = 'toast-wrapper';
        document.body.appendChild(toastWrapper);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };
    
    toast.innerHTML = `
        ${icons[type]}
        <span>${message}</span>
    `;

    toastWrapper.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            if (toastWrapper && !toastWrapper.hasChildNodes()) {
                toastWrapper.remove();
            }
        }, { once: true });
    }, 3000);
}


// Local Storage Keys
const LS_TEMPLATES_KEY = 'craftor_saved_templates';
const LS_DRAFT_KEY = 'craftor_current_draft';
const LS_COLLAPSED_KEY = 'craftor_component_states';


const loadCollapsedStates = () => {
    try {
        const data = localStorage.getItem(LS_COLLAPSED_KEY);
        collapsedStates = data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Failed to load component states", e);
        collapsedStates = {};
    }
};

const saveCollapsedStates = () => {
    localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(collapsedStates));
};

const toggleComponent = (id: string) => {
    const componentEl = document.querySelector(`.component-item[data-id='${id}']`);
    if (componentEl) {
        const isCollapsed = componentEl.classList.toggle('collapsed');
        collapsedStates[id] = isCollapsed;
        saveCollapsedStates();
    }
};


const truncate = (str: string, maxLength: number): string => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

// Debounce helper for preview updates
let previewTimer: number;
const triggerPreviewUpdate = () => {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
        if (previewPane) {
            try {
                previewPane.srcdoc = generateEmailHtml();
            } catch (e) {
                console.error("Preview generation failed:", e);
            }
        }
    }, 300);
};

const saveDraft = () => {
    try {
        localStorage.setItem(LS_DRAFT_KEY, JSON.stringify({
            designSettings,
            activeComponents
        }));
        triggerPreviewUpdate();
    } catch (e) {
        console.error("Failed to save draft", e);
    }
};

// Design Customization Logic
fontSelect?.addEventListener('change', () => {
    designSettings.fontFamily = fontSelect.value;
    saveDraft();
    saveToHistory();
    showToast('Font updated', 'success');
});

// View Toggles
desktopViewBtn?.addEventListener('click', () => {
    desktopViewBtn.classList.add('active');
    mobileViewBtn?.classList.remove('active');
    previewPane.className = 'preview-frame desktop';
});

mobileViewBtn?.addEventListener('click', () => {
    mobileViewBtn.classList.add('active');
    desktopViewBtn?.classList.remove('active');
    previewPane.className = 'preview-frame mobile';
});

let lastFocusedInput: HTMLInputElement | HTMLTextAreaElement | null = null;

document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement;
  const componentId = target.closest('.component-item')?.getAttribute('data-id');
  if (componentId) {
      selectComponent(componentId);
  }

  if (target.hasAttribute('data-stylable')) {
      if (activeField?.element) {
          activeField.element.classList.remove('field-active');
      }
      
      const fieldKey = target.dataset.fieldKey;
      const fieldLabel = target.dataset.fieldLabel;
      const subOfferIndex = target.dataset.subOfferIndex ? parseInt(target.dataset.subOfferIndex) : undefined;
      
      if (componentId && fieldKey && fieldLabel) {
          activeField = {
              componentId,
              fieldKey,
              fieldLabel,
              element: target,
              subOfferIndex
          };
          target.classList.add('field-active');
          renderStylingPanel();
      }
  }

  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    lastFocusedInput = target as HTMLInputElement | HTMLTextAreaElement;
  }
});

const insertMergeField = (value: string) => {
    if (lastFocusedInput) {
        const start = lastFocusedInput.selectionStart || 0;
        const end = lastFocusedInput.selectionEnd || 0;
        const text = lastFocusedInput.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        lastFocusedInput.value = before + value + after;
        lastFocusedInput.selectionStart = lastFocusedInput.selectionEnd = start + value.length;
        lastFocusedInput.focus();
        
        lastFocusedInput.dispatchEvent(new Event('input', { bubbles: true }));
        showToast(`Inserted: ${value}`, 'success');
        closeSidebarFunc();
    } else {
        showToast('Please click a text field first to insert the merge field.', 'info');
    }
};

const renderMergeFieldsSidebar = () => {
    if (!mergeFieldsSidebar) return;
    const contentContainer = mergeFieldsSidebar.querySelector('.sidebar-content');
    if (!contentContainer) return;
    
    contentContainer.innerHTML = '';

    MERGE_FIELDS.forEach(group => {
        const details = document.createElement('details');
        details.className = 'sidebar-group';
        details.setAttribute('open', '');
        
        const summary = document.createElement('summary');
        summary.textContent = group.title;
        details.appendChild(summary);

        const content = document.createElement('div');
        content.className = 'sidebar-group-content';

        const createItemEl = (item: MergeFieldItem) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'merge-field-item';
            itemEl.innerHTML = `<span style="font-weight: 500;">${item.label}</span>`;
            itemEl.addEventListener('click', () => insertMergeField(item.value));
            return itemEl;
        };

        if (group.items) group.items.forEach(item => content.appendChild(createItemEl(item)));
        if (group.subgroups) {
            group.subgroups.forEach(sub => {
                const subHeader = document.createElement('div');
                subHeader.style.cssText = 'font-size: 11px; font-weight: 700; color: var(--label-tertiary); margin-top: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;';
                subHeader.textContent = sub.title;
                content.appendChild(subHeader);
                sub.items.forEach(item => content.appendChild(createItemEl(item)));
            });
        }
        details.appendChild(content);
        contentContainer.appendChild(details);
    });
};

// Sidebar Controls
const openDesignSidebar = () => {
    designSidebar?.classList.add('open');
    designSidebarOverlay?.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

const closeDesignSidebarFunc = () => {
    designSidebar?.classList.remove('open');
    designSidebarOverlay?.classList.remove('visible');
    document.body.style.overflow = '';
}

const closeSidebarFunc = () => {
  mergeFieldsSidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
};

const closeComponentPickerFunc = () => {
    componentPickerOverlay?.classList.remove('visible');
};

addComponentBtn?.addEventListener('click', () => {
    componentPickerOverlay?.classList.add('visible');
});

closeComponentPicker?.addEventListener('click', closeComponentPickerFunc);
componentPickerOverlay?.addEventListener('click', (e) => {
    if (e.target === componentPickerOverlay) closeComponentPickerFunc();
});

const pickerOptions = document.querySelectorAll('.picker-option');
pickerOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    const type = opt.getAttribute('data-type');
    if (type) {
      addNewComponent(type);
      closeComponentPickerFunc();
    }
  });
});

mobileMenuToggle?.addEventListener('click', openDesignSidebar);
closeDesignSidebar?.addEventListener('click', closeDesignSidebarFunc);
designSidebarOverlay?.addEventListener('click', closeDesignSidebarFunc);

closeMergeSidebar?.addEventListener('click', closeSidebarFunc);
sidebarOverlay?.addEventListener('click', closeSidebarFunc);

mergeFieldsToggle?.addEventListener('click', () => {
  mergeFieldsSidebar?.classList.add('open');
  sidebarOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
});

floatingMergeBtn?.addEventListener('click', () => {
  mergeFieldsSidebar?.classList.add('open');
  sidebarOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
});

const addNewComponent = (type: string) => {
    const id = Date.now().toString();
    let data: Record<string, string> = {};
    
    if (type === 'header') {
        data = {
            text: 'Your Header Title',
            fontSize: '24',
            textColor: '#1d1d1f',
            backgroundColor: 'transparent',
            fontWeight: 'bold',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'center',
            paddingTop: '20',
            paddingBottom: '20',
            paddingLeftRight: '20'
        };
    } else if (type === 'text_block') {
        data = {
            text: 'This is a sample text block. You can use merge fields here.',
            fontSize: '16',
            textColor: '#3c3c43',
            backgroundColor: 'transparent',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'left',
            paddingTop: '10',
            paddingBottom: '10',
            paddingLeftRight: '20'
        };
    } else if (type === 'image') {
        data = {
            src: 'https://via.placeholder.com/600x300',
            alt: 'Image description',
            link: '',
            width: '100%',
            align: 'center',
            paddingTop: '0',
            paddingBottom: '0',
            paddingLeftRight: '0',
            backgroundColor: 'transparent'
        };
    } else if (type === 'button') {
        data = {
            text: 'Click Here',
            link: 'https://example.com',
            fontSize: '16',
            textColor: '#ffffff',
            backgroundColor: '#007aff',
            align: 'center',
            paddingTop: '12',
            paddingBottom: '12',
            paddingLeftRight: '20',
            widthType: 'auto'
        };
    } else if (type === 'divider') {
        data = {
            width: '100',
            thickness: '2',
            lineColor: '#CCCCCC',
            alignment: 'center',
            paddingTop: '16',
            paddingBottom: '16',
            paddingLeftRight: '0'
        };
    } else if (type === 'spacer') {
        data = {
            height: '40',
            backgroundColor: 'transparent',
            matchEmailBackground: 'true',
        };
    } else if (type === 'service_offer') {
        data = {
            layout: 'single',
            // Offer 1 Content
            showImage: 'false',
            imageUrl: '',
            imageAlt: '',
            imageLink: '',
            serviceTitle: 'Oil Change Special',
            couponCode: 'OILCHANGE50',
            serviceDetails: 'Get $50 off your next oil change service. Includes up to 5 quarts of synthetic blend oil and filter replacement.',
            disclaimer: '*Valid at participating dealers only. Cannot be combined with other offers.',
            buttonText: 'Schedule Now',
            buttonLink: '',
            // Offer 2 Content
            showImage2: 'false',
            imageUrl2: '',
            imageAlt2: '',
            imageLink2: '',
            serviceTitle2: 'Tire Rotation Deal',
            couponCode2: 'TIRES25',
            serviceDetails2: 'Get $25 off your next tire rotation. Keep your tires wearing evenly and extend their life.',
            disclaimer2: '*Valid at participating dealers only. Cannot be combined with other offers.',
            buttonText2: 'Book Service',
            buttonLink2: '',
            // Styling Offer 1
            containerPaddingTop: '20', containerPaddingBottom: '20', containerPaddingLeft: '20', containerPaddingRight: '20',
            imageWidth: '100', imageAlignment: 'center', imagePaddingTop: '10', imagePaddingBottom: '10',
            titleFontSize: '24', titleFontWeight: 'bold', titleFontStyle: 'normal', titleTextColor: '#000000', titleBgColor: 'transparent', titleAlignment: 'center', titlePaddingTop: '10', titlePaddingBottom: '10', titlePaddingLeftRight: '0',
            couponFontSize: '20', couponFontWeight: 'bold', couponFontStyle: 'normal', couponTextColor: '#0066FF', couponBgColor: '#F0F7FF', couponAlignment: 'center', couponPaddingTop: '8', couponPaddingBottom: '8', couponPaddingLeftRight: '16', couponShowBorder: 'false', couponBorderStyle: 'dashed', couponBorderColor: '#0066FF',
            detailsFontSize: '16', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsTextColor: '#333333', detailsBgColor: 'transparent', detailsAlignment: 'center', detailsLineHeight: '1.5', detailsPaddingTop: '12', detailsPaddingBottom: '12', detailsPaddingLeftRight: '0',
            disclaimerFontSize: '12', disclaimerFontWeight: 'normal', disclaimerFontStyle: 'normal', disclaimerTextColor: '#666666', disclaimerBgColor: 'transparent', disclaimerAlignment: 'center', disclaimerPaddingTop: '8', disclaimerPaddingBottom: '8', disclaimerPaddingLeftRight: '0',
            buttonFontSize: '16', buttonAlignment: 'center', buttonBgColor: '#0066FF', buttonTextColor: '#FFFFFF', buttonPaddingTop: '12', buttonPaddingBottom: '12', buttonPaddingLeftRight: '20', buttonWidth: 'auto',
            // Styling Offer 2
            imageWidth2: '100', imageAlignment2: 'center', imagePaddingTop2: '10', imagePaddingBottom2: '10',
            titleFontSize2: '24', titleFontWeight2: 'bold', titleFontStyle2: 'normal', titleTextColor2: '#000000', titleBgColor2: 'transparent', titleAlignment2: 'center', titlePaddingTop2: '10', titlePaddingBottom2: '10', titlePaddingLeftRight2: '0',
            couponFontSize2: '20', couponFontWeight2: 'bold', couponFontStyle2: 'normal', couponTextColor2: '#0066FF', couponBgColor2: '#F0F7FF', couponAlignment2: 'center', couponPaddingTop2: '8', couponPaddingBottom2: '8', couponPaddingLeftRight2: '16', couponShowBorder2: 'false', couponBorderStyle2: 'dashed', couponBorderColor2: '#0066FF',
            detailsFontSize2: '16', detailsFontWeight2: 'normal', detailsFontStyle2: 'normal', detailsTextColor2: '#333333', detailsBgColor2: 'transparent', detailsAlignment2: 'center', detailsLineHeight2: '1.5', detailsPaddingTop2: '12', detailsPaddingBottom2: '12', detailsPaddingLeftRight2: '0',
            disclaimerFontSize2: '12', disclaimerFontWeight2: 'normal', disclaimerFontStyle2: 'normal', disclaimerTextColor2: '#666666', disclaimerBgColor2: 'transparent', disclaimerAlignment2: 'center', disclaimerPaddingTop2: '8', disclaimerPaddingBottom2: '8', disclaimerPaddingLeftRight2: '0',
            buttonFontSize2: '16', buttonAlignment2: 'center', buttonBgColor2: '#0066FF', buttonTextColor2: '#FFFFFF', buttonPaddingTop2: '12', buttonPaddingBottom2: '12', buttonPaddingLeftRight2: '20', buttonWidth2: 'auto'
        };
    } else if (type === 'sales_offer') {
        data = {
            layout: 'center',
            // Offer 1
            imageEnabled: 'true',
            imageSrc: 'https://via.placeholder.com/600x300',
            imageAlt: 'New Sales Offer',
            imageLink: '',
            imageWidth: '100%',
            vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}',
            mainOfferText: '$2,500 Trade-In Bonus',
            detailsText: 'Upgrade your current ride today with our exclusive seasonal offer.',
            stockVinType: 'stock',
            stockVinValue: '{{customer.last_transaction.vehicle.vin}}',
            mileageValue: '{{customer.last_transaction.vehicle.mileage}}',
            disclaimerText: '*Terms and conditions apply. Offer valid through end of month.',
            additionalOffers: '[]',
            btnText: 'View Details',
            btnLink: '{{dealership.tracked_website_homepage_url}}',
            // Offer 2
            imageEnabled2: 'true',
            imageSrc2: 'https://via.placeholder.com/600x300',
            imageAlt2: 'Used Sales Offer',
            imageLink2: '',
            imageWidth2: '100%',
            vehicleText2: 'Pre-Owned Vehicle Special',
            mainOfferText2: 'Low APR Financing',
            detailsText2: 'Get behind the wheel of a quality pre-owned vehicle with great financing options.',
            stockVinType2: 'stock',
            stockVinValue2: '',
            mileageValue2: '',
            disclaimerText2: '*With approved credit. See dealer for details.',
            additionalOffers2: '[]',
            btnText2: 'View Inventory',
            btnLink2: '{{dealership.tracked_website_specials_url}}',
            // Styling Offer 1
            vehicleFontSize: '14', vehicleFontWeight: 'normal', vehicleFontStyle: 'normal', vehicleColor: '#1d1d1f', vehicleBgColor: 'transparent', vehicleTextAlign: 'center', vehiclePaddingTop: '0', vehiclePaddingBottom: '8', vehiclePaddingLeftRight: '0',
            mainOfferFontSize: '18', mainOfferFontWeight: 'normal', mainOfferFontStyle: 'normal', mainOfferColor: '#007aff', mainOfferBgColor: 'transparent', mainOfferTextAlign: 'center', mainOfferPaddingTop: '0', mainOfferPaddingBottom: '8', mainOfferPaddingLeftRight: '0',
            detailsFontSize: '10', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsColor: '#6e6e73', detailsBgColor: 'transparent', detailsTextAlign: 'center', detailsPaddingTop: '0', detailsPaddingBottom: '12', detailsPaddingLeftRight: '0',
            stockVinFontSize: '11', stockVinFontWeight: 'normal', stockVinFontStyle: 'normal', stockVinColor: '#86868b', stockVinBgColor: 'transparent', stockVinTextAlign: 'center', stockVinPaddingTop: '10', stockVinPaddingBottom: '0', stockVinPaddingLeftRight: '0',
            mileageFontSize: '11', mileageFontWeight: 'normal', mileageFontStyle: 'normal', mileageColor: '#86868b', mileageBgColor: 'transparent', mileageTextAlign: 'center', mileagePaddingTop: '4', mileagePaddingBottom: '0', mileagePaddingLeftRight: '0',
            disclaimerFontSize: '10', disclaimerFontWeight: 'normal', disclaimerFontStyle: 'normal', disclaimerColor: '#86868b', disclaimerBgColor: 'transparent', disclaimerTextAlign: 'center', disclaimerPaddingTop: '16', disclaimerPaddingBottom: '0', disclaimerPaddingLeftRight: '0',
            btnFontSize: '14', btnPaddingTop: '12', btnPaddingBottom: '12', btnPaddingLeftRight: '20', btnColor: '#007aff', btnTextColor: '#ffffff', btnAlign: 'center', btnWidthType: 'full',
            // Styling Offer 2 (mirrors offer 1)
            vehicleFontSize2: '14', vehicleFontWeight2: 'normal', vehicleFontStyle2: 'normal', vehicleColor2: '#1d1d1f', vehicleBgColor2: 'transparent', vehicleTextAlign2: 'center', vehiclePaddingTop2: '0', vehiclePaddingBottom2: '8', vehiclePaddingLeftRight2: '0',
            mainOfferFontSize2: '18', mainOfferFontWeight2: 'normal', mainOfferFontStyle2: 'normal', mainOfferColor2: '#007aff', mainOfferBgColor2: 'transparent', mainOfferTextAlign2: 'center', mainOfferPaddingTop2: '0', mainOfferPaddingBottom2: '8', mainOfferPaddingLeftRight2: '0',
            detailsFontSize2: '10', detailsFontWeight2: 'normal', detailsFontStyle2: 'normal', detailsColor2: '#6e6e73', detailsBgColor2: 'transparent', detailsTextAlign2: 'center', detailsPaddingTop2: '0', detailsPaddingBottom2: '12', detailsPaddingLeftRight2: '0',
            stockVinFontSize2: '11', stockVinFontWeight2: 'normal', stockVinFontStyle2: 'normal', stockVinColor2: '#86868b', stockVinBgColor2: 'transparent', stockVinTextAlign2: 'center', stockVinPaddingTop2: '10', stockVinPaddingBottom2: '0', stockVinPaddingLeftRight2: '0',
            mileageFontSize2: '11', mileageFontWeight2: 'normal', mileageFontStyle2: 'normal', mileageColor2: '#86868b', mileageBgColor2: 'transparent', mileageTextAlign2: 'center', mileagePaddingTop2: '4', mileagePaddingBottom2: '0', mileagePaddingLeftRight2: '0',
            disclaimerFontSize2: '10', disclaimerFontWeight2: 'normal', disclaimerFontStyle2: 'normal', disclaimerColor2: '#86868b', disclaimerBgColor2: 'transparent', disclaimerTextAlign2: 'center', disclaimerPaddingTop2: '16', disclaimerPaddingBottom2: '0', disclaimerPaddingLeftRight2: '0',
            btnFontSize2: '14', btnPaddingTop2: '12', btnPaddingBottom2: '12', btnPaddingLeftRight2: '20', btnColor2: '#007aff', btnTextColor2: '#ffffff', btnAlign2: 'center', btnWidthType2: 'full',
            // Container styles
            paddingTop: '20',
            paddingBottom: '20',
            paddingLeftRight: '20',
            backgroundColor: '#ffffff'
        };
    }

    activeComponents.push({ id, type, data });
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`${type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1)} added`, 'success');
};

const removeComponent = (id: string) => {
    activeComponents = activeComponents.filter(c => c.id !== id);
    if (selectedComponentId === id) {
        selectedComponentId = null;
    }
    delete collapsedStates[id];
    saveCollapsedStates();
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Section removed', 'success');
};

const duplicateComponent = (id: string) => {
    const originalIndex = activeComponents.findIndex(c => c.id === id);
    if (originalIndex === -1) {
        console.error("Component to duplicate not found");
        return;
    }

    const originalComponent = activeComponents[originalIndex];
    const newComponent = JSON.parse(JSON.stringify(originalComponent)) as EmailComponent;
    const newId = Date.now().toString();
    newComponent.id = newId;

    activeComponents.splice(originalIndex + 1, 0, newComponent);
    
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Section duplicated', 'success');

    setTimeout(() => {
        selectComponent(newId);
        const newElement = document.querySelector(`.component-item[data-id='${newId}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

const updateComponentData = (id: string, key: string, value: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (comp) {
        comp.data[key] = value;
        saveDraft();
        saveToHistory();
    }
};

const updateSubOfferData = (componentId: string, index: number, key: string, value: string, offerKey: string = 'additionalOffers') => {
    const comp = activeComponents.find(c => c.id === componentId);
    if (comp && comp.type === 'sales_offer') {
        try {
            const offers = JSON.parse(comp.data[offerKey] || '[]');
            if (offers[index]) {
                offers[index][key] = value;
                comp.data[offerKey] = JSON.stringify(offers);
                saveDraft();
                saveToHistory();
            }
        } catch (e) {
            console.error("Failed to update sub-offer data", e);
        }
    }
};

const selectComponent = (id: string | null) => {
    if (selectedComponentId === id) return;

    // Deselect previous
    if (selectedComponentId) {
        const prevEl = document.querySelector(`.component-item[data-id='${selectedComponentId}']`);
        prevEl?.classList.remove('selected');
    }

    selectedComponentId = id;

    // Select new
    if (selectedComponentId) {
        const newEl = document.querySelector(`.component-item[data-id='${selectedComponentId}']`);
        newEl?.classList.add('selected');
    }
};

// --- START: Fix for missing functions
function generateServiceOfferFormHtml(comp: EmailComponent, suffix: string): string {
    const d = comp.data;
    const isChecked = d[`showImage${suffix}`] === 'true';
    const displayStyle = isChecked ? 'flex' : 'none';

    return `
        <div class="form-group-inline wrap">
            <div class="toggle-switch-group">
                <div class="toggle-switch compact">
                    <input type="checkbox" id="show-image-${comp.id}-${suffix || '1'}" class="toggle-switch-checkbox" data-key="showImage${suffix}" ${isChecked ? 'checked' : ''}>
                    <label for="show-image-${comp.id}-${suffix || '1'}" class="toggle-switch-label"></label>
                </div>
                <label for="show-image-${comp.id}-${suffix || '1'}" class="toggle-switch-text-label">Show Image</label>
            </div>
        </div>
        <div id="service-image-fields-${comp.id}-${suffix || '1'}" style="display: ${displayStyle}; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
            <div class="form-group-inline wrap">
                <div class="inline-input-group"><label>URL:</label><input type="text" class="form-control compact" data-key="imageUrl${suffix}" value="${d[`imageUrl${suffix}`] || ''}"></div>
                <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="${suffix || '1'}">
            </div>
            <div class="form-group-inline wrap">
                <div class="inline-input-group"><label>Alt:</label><input type="text" class="form-control compact" data-key="imageAlt${suffix}" value="${d[`imageAlt${suffix}`] || ''}"></div>
                <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="imageLink${suffix}" value="${d[`imageLink${suffix}`] || ''}"></div>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-control" data-key="serviceTitle${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferTitle${suffix}" data-field-label="Service Title ${suffix || '1'}" value="${d[`serviceTitle${suffix}`] || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Coupon Code</label>
            <input type="text" class="form-control" data-key="couponCode${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferCoupon${suffix}" data-field-label="Coupon Code ${suffix || '1'}" value="${d[`couponCode${suffix}`] || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Details</label>
            <textarea class="form-control" data-key="serviceDetails${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferDetails${suffix}" data-field-label="Service Details ${suffix || '1'}">${d[`serviceDetails${suffix}`] || ''}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Disclaimer</label>
            <textarea class="form-control" data-key="disclaimer${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferDisclaimer${suffix}" data-field-label="Disclaimer ${suffix || '1'}">${d[`disclaimer${suffix}`] || ''}</textarea>
        </div>
        <div class="form-group-inline wrap">
            <div class="inline-input-group"><label>Btn Text:</label><input type="text" class="form-control compact" data-key="buttonText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton${suffix}" data-field-label="Button ${suffix || '1'} Text" value="${d[`buttonText${suffix}`] || ''}"></div>
            <div class="inline-input-group"><label>Btn Link:</label><input type="text" class="form-control compact" data-key="buttonLink${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton${suffix}" data-field-label="Button ${suffix || '1'} Link" value="${d[`buttonLink${suffix}`] || ''}"></div>
        </div>
    `;
}

function generateSubOffersHtml(comp: EmailComponent, suffix: string): string {
    const offersKey = `additionalOffers${suffix}`;
    let offers: any[];
    try {
        offers = JSON.parse(comp.data[offersKey] || '[]');
    } catch {
        offers = [];
    }

    let html = offers.map((offer, index) => `
        <div class="sub-offer-item card" style="margin-top: 10px;">
             <div class="card-header" style="background-color: var(--background-secondary);">
                <span class="component-title text-xs font-bold uppercase" style="color: var(--label-secondary);">Additional Offer ${index + 1}</span>
                <button type="button" class="btn btn-ghost btn-sm remove-sub-offer" data-index="${index}" data-offer-index="${suffix || '1'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Separator Text</label>
                    <input type="text" class="form-control sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="separator" value="${offer.separator || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="separator${suffix}" data-sub-offer-index="${index}" data-field-label="Separator">
                </div>
                <div class="form-group">
                    <label class="form-label">Offer Title</label>
                    <input type="text" class="form-control sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="offer" value="${offer.offer || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="offer${suffix}" data-sub-offer-index="${index}" data-field-label="Offer Title">
                </div>
                <div class="form-group">
                    <label class="form-label">Offer Details</label>
                    <textarea class="form-control sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="details" data-stylable="true" data-component-id="${comp.id}" data-field-key="details${suffix}" data-sub-offer-index="${index}" data-field-label="Offer Details">${offer.details || ''}</textarea>
                </div>
            </div>
        </div>
    `).join('');

    html += `
        <button type="button" class="btn btn-secondary add-sub-offer-btn" data-offer-index="${suffix || '1'}" style="margin-top: 10px;">+ Add Additional Offer</button>
    `;

    return html;
}

function generateSalesOfferFormHtml(comp: EmailComponent, suffix: string): string {
    const d = comp.data;
    const isGrid = d.layout === 'grid';
    let html = '';

    if (suffix === '2' || isGrid) {
        const isChecked = d[`imageEnabled${suffix}`] === 'true';
        const displayStyle = isChecked ? 'flex' : 'none';
        html += `
            <div class="form-group-inline wrap">
                <div class="toggle-switch-group">
                    <div class="toggle-switch compact">
                        <input type="checkbox" id="image-enabled-${comp.id}-${suffix || '1'}" class="toggle-switch-checkbox" data-key="imageEnabled${suffix}" ${isChecked ? 'checked' : ''}>
                        <label for="image-enabled-${comp.id}-${suffix || '1'}" class="toggle-switch-label"></label>
                    </div>
                    <label for="image-enabled-${comp.id}-${suffix || '1'}" class="toggle-switch-text-label">Show Image</label>
                </div>
            </div>
            <div id="image-fields-container-${comp.id}-${suffix || '1'}" style="display: ${displayStyle}; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
                <div class="form-group-inline wrap">
                    <div class="inline-input-group"><label>URL:</label><input type="text" class="form-control compact" data-key="imageSrc${suffix}" value="${d[`imageSrc${suffix}`] || ''}"></div>
                    <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                    <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="${suffix || '1'}">
                </div>
                <div class="form-group-inline wrap">
                    <div class="inline-input-group"><label>Alt:</label><input type="text" class="form-control compact" data-key="imageAlt${suffix}" value="${d[`imageAlt${suffix}`] || ''}"></div>
                    <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="imageLink${suffix}" value="${d[`imageLink${suffix}`] || ''}"></div>
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="form-group">
            <label class="form-label">Vehicle</label>
            <input type="text" class="form-control" data-key="vehicleText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="vehicle${suffix}" data-field-label="Vehicle Text" value="${d[`vehicleText${suffix}`] || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Main Offer</label>
            <input type="text" class="form-control" data-key="mainOfferText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="mainOffer${suffix}" data-field-label="Main Offer" value="${d[`mainOfferText${suffix}`] || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Details</label>
            <textarea class="form-control" data-key="detailsText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="details${suffix}" data-field-label="Details">${d[`detailsText${suffix}`] || ''}</textarea>
        </div>

        <div class="form-group-inline wrap">
             <div class="inline-input-group">
                <label>Identifier</label>
                <select class="form-control compact" data-key="stockVinType${suffix}">
                    <option value="stock" ${d[`stockVinType${suffix}`] === 'stock' ? 'selected' : ''}>Stock #</option>
                    <option value="vin" ${d[`stockVinType${suffix}`] === 'vin' ? 'selected' : ''}>VIN</option>
                </select>
            </div>
            <div class="inline-input-group">
                <label>Value</label>
                <input type="text" class="form-control compact" data-key="stockVinValue${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="stockVin${suffix}" data-field-label="Stock/VIN" value="${d[`stockVinValue${suffix}`] || ''}">
            </div>
            <div class="inline-input-group">
                <label>Mileage</label>
                <input type="text" class="form-control compact" data-key="mileageValue${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="mileage${suffix}" data-field-label="Mileage" value="${d[`mileageValue${suffix}`] || ''}">
            </div>
        </div>

        <div class="sub-offers-container" id="sub-offers-${comp.id}${suffix}">
            ${generateSubOffersHtml(comp, suffix)}
        </div>
        
        <div class="form-group">
            <label class="form-label">Disclaimer</label>
            <textarea class="form-control" data-key="disclaimerText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimer${suffix}" data-field-label="Disclaimer">${d[`disclaimerText${suffix}`] || ''}</textarea>
        </div>
        <div class="form-group-inline wrap">
            <div class="inline-input-group"><label>Button Text</label><input type="text" class="form-control compact" data-key="btnText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton${suffix}" data-field-label="Button Text" value="${d[`btnText${suffix}`] || ''}"></div>
            <div class="inline-input-group"><label>Button Link</label><input type="text" class="form-control compact" data-key="btnLink${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton${suffix}" data-field-label="Button Link" value="${d[`btnLink${suffix}`] || ''}"></div>
        </div>
    `;

    return html;
}
// --- END: Fix for missing functions

const renderComponents = () => {
    componentsContainer.innerHTML = '';
    if (activeComponents.length === 0) {
        componentsContainer.innerHTML = `
            <div id="empty-state-message" style="text-align: center; padding: 40px 20px; border: 2px dashed var(--separator-primary); border-radius: var(--radius-lg); color: var(--label-secondary);">
                <p>No sections added yet. Click "+ Add Section" to begin.</p>
            </div>
        `;
        return;
    }

    activeComponents.forEach((comp, index) => {
        const item = document.createElement('div');
        item.className = 'component-item card';
        if (comp.id === selectedComponentId) {
            item.classList.add('selected');
        }
        item.setAttribute('data-id', comp.id);
        item.setAttribute('draggable', 'true');
        item.setAttribute('tabindex', '-1'); // Make it focusable for selection
        
        item.addEventListener('click', (e) => {
            // Prevent selection when interacting with form elements inside
            if ((e.target as HTMLElement).closest('.card-body, .card-header button, .drag-handle')) return;
             selectComponent(comp.id);
        });

        if (collapsedStates[comp.id]) {
            item.classList.add('collapsed');
        }
        
        let componentFormHtml = '';
        let dynamicTitle = '';
        const defaultTitleText = comp.type.replace(/_/g, ' ');
        let sourceFieldKey = '';
        const TRUNCATE_LENGTH = 45;

        switch (comp.type) {
            case 'header':
            case 'text_block':
                sourceFieldKey = 'text';
                break;
            case 'image':
                sourceFieldKey = 'alt';
                break;
            case 'button':
                sourceFieldKey = 'text';
                break;
            case 'sales_offer':
                sourceFieldKey = 'vehicleText';
                break;
            case 'service_offer':
                sourceFieldKey = 'serviceTitle';
                break;
            case 'divider':
            case 'spacer':
                sourceFieldKey = ''; // No dynamic title source
                break;
        }

        const sourceValue = sourceFieldKey ? comp.data[sourceFieldKey] || '' : '';
        dynamicTitle = sourceValue ? truncate(sourceValue, TRUNCATE_LENGTH) : defaultTitleText;
        
        if (comp.type === 'header') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Header Content</label>
                    <textarea class="form-control" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="header" data-field-label="Header Content">${comp.data.text || ''}</textarea>
                </div>
            `;
        } else if (comp.type === 'text_block') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Text Content</label>
                    <textarea class="form-control" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="textBlock" data-field-label="Text Block Content">${comp.data.text || ''}</textarea>
                </div>
            `;
        } else if (comp.type === 'image') {
            componentFormHtml = `
                 <div class="image-component-form">
                    <div class="form-group-inline wrap">
                        <div class="inline-input-group">
                            <label>Source URL:</label>
                            <input type="text" class="form-control compact" data-key="src" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Source" value="${comp.data.src || ''}">
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                        <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp">
                    </div>
                    <div class="form-group-inline wrap">
                        <div class="inline-input-group">
                            <label>Alt Text:</label>
                            <input type="text" class="form-control compact" data-key="alt" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Alt Text" value="${comp.data.alt || ''}">
                        </div>
                        <div class="inline-input-group">
                            <label>Link URL:</label>
                            <input type="text" class="form-control compact" data-key="link" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Link" value="${comp.data.link || ''}">
                        </div>
                    </div>
                </div>
            `;
        } else if (comp.type === 'button') {
            componentFormHtml = `
                 <div class="form-group-inline wrap">
                    <div class="inline-input-group"><label>Text:</label><input type="text" class="form-control compact" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="button" data-field-label="Button Text" value="${comp.data.text || ''}"></div>
                    <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="link" data-stylable="true" data-component-id="${comp.id}" data-field-key="button" data-field-label="Button Link" value="${comp.data.link || ''}"></div>
                </div>
            `;
        } else if (comp.type === 'divider') {
            componentFormHtml = `
                <div class="divider-preview-container" tabindex="0" data-alignment="${comp.data.alignment}" style="padding: ${comp.data.paddingTop}px 20px ${comp.data.paddingBottom}px 20px;" data-stylable="true" data-component-id="${comp.id}" data-field-key="divider" data-field-label="Divider">
                    <div class="divider-preview-line" style="width: ${comp.data.width}%; height: ${comp.data.thickness}px; background-color: ${comp.data.lineColor};"></div>
                </div>
            `;
        } else if (comp.type === 'spacer') {
            const matchBg = comp.data.matchEmailBackground === 'true';
            const bgColor = matchBg ? 'transparent' : comp.data.backgroundColor;
            const hasBg = !matchBg && bgColor !== 'transparent';

            componentFormHtml = `
                <div class="spacer-preview ${hasBg ? 'has-bg-color' : ''}" style="height: ${comp.data.height}px; background-color: ${bgColor};" data-stylable="true" data-component-id="${comp.id}" data-field-key="spacer" data-field-label="Spacer" tabindex="0">
                    <span class="spacer-preview-label">Height: ${comp.data.height}px</span>
                </div>
            `;
        } else if (comp.type === 'service_offer') {
            const isGrid = comp.data.layout === 'grid';
            componentFormHtml = `
                <div class="form-group-inline">
                    <label class="form-label-inline">Layout</label>
                    <div class="toggle-group">
                        <button type="button" class="toggle-btn layout-toggle ${!isGrid ? 'active' : ''}" data-key="layout" data-value="single">Single</button>
                        <button type="button" class="toggle-btn layout-toggle ${isGrid ? 'active' : ''}" data-key="layout" data-value="grid">Grid</button>
                    </div>
                </div>
                <div class="offer-columns-container" data-layout="${comp.data.layout || 'single'}">
                    <div class="offer-column">
                         <h4 class="offer-column-title">Offer 1</h4>
                        ${generateServiceOfferFormHtml(comp, '')}
                    </div>
                    <div class="offer-column offer-column-2">
                        <h4 class="offer-column-title">Offer 2</h4>
                        ${generateServiceOfferFormHtml(comp, '2')}
                    </div>
                </div>
            `;
        } else if (comp.type === 'sales_offer') {
            // Data Migration for old templates
            if (comp.data.stockVinText && !comp.data.stockVinValue) {
                comp.data.stockVinValue = comp.data.stockVinText;
                delete comp.data.stockVinText;
            }
            if (comp.data.mileageText && !comp.data.mileageValue) {
                comp.data.mileageValue = comp.data.mileageText;
                delete comp.data.mileageText;
            }
            if (!comp.data.stockVinType) {
                comp.data.stockVinType = 'stock';
            }
            const isGrid = comp.data.layout === 'grid';
            componentFormHtml = `
                <div class="form-group-inline">
                    <label class="form-label-inline">Offer Layout</label>
                    <select class="form-control compact" data-key="layout">
                        <option value="left" ${comp.data.layout === 'left' ? 'selected' : ''}>Left (Image Left)</option>
                        <option value="center" ${comp.data.layout === 'center' ? 'selected' : ''}>Center (Image Top)</option>
                        <option value="right" ${comp.data.layout === 'right' ? 'selected' : ''}>Right (Image Right)</option>
                        <option value="grid" ${comp.data.layout === 'grid' ? 'selected' : ''}>Grid (2 Column)</option>
                    </select>
                </div>

                <div class="single-offer-settings" style="display: ${isGrid ? 'none' : 'block'};">
                  <div class="form-group-inline wrap">
                      <div class="toggle-switch-group">
                          <div class="toggle-switch compact">
                              <input type="checkbox" id="image-enabled-${comp.id}" class="toggle-switch-checkbox" data-key="imageEnabled" ${comp.data.imageEnabled === 'true' ? 'checked' : ''}>
                              <label for="image-enabled-${comp.id}" class="toggle-switch-label"></label>
                          </div>
                          <label for="image-enabled-${comp.id}" class="toggle-switch-text-label">Show Image</label>
                      </div>
                      <div id="image-fields-container-${comp.id}" style="display: ${comp.data.imageEnabled === 'true' ? 'flex' : 'none'}; gap: var(--spacing-md); flex: 1; flex-wrap: wrap; align-items: center;">
                          <div class="inline-input-group"><label>URL:</label><input type="text" class="form-control compact" data-key="imageSrc" value="${comp.data.imageSrc || ''}"></div>
                          <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                          <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="1">
                          <div class="inline-input-group"><label>Alt:</label><input type="text" class="form-control compact" data-key="imageAlt" value="${comp.data.imageAlt || ''}"></div>
                          <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="imageLink" value="${comp.data.imageLink || ''}"></div>
                      </div>
                  </div>
                </div>
                
                <div class="offer-columns-container" data-layout="${comp.data.layout || 'center'}">
                    <div class="offer-column">
                        ${!isGrid ? '' : '<h4 class="offer-column-title">Offer 1</h4>'}
                        ${generateSalesOfferFormHtml(comp, '')}
                    </div>
                    <div class="offer-column offer-column-2">
                         <h4 class="offer-column-title">Offer 2</h4>
                        ${generateSalesOfferFormHtml(comp, '2')}
                    </div>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="card-header">
                <span class="drag-handle" title="Drag to reorder">
                    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                        <circle cx="3" cy="3" r="1.5"></circle>
                        <circle cx="9" cy="3" r="1.5"></circle>
                        <circle cx="3" cy="8" r="1.5"></circle>
                        <circle cx="9" cy="8" r="1.5"></circle>
                        <circle cx="3" cy="13" r="1.5"></circle>
                        <circle cx="9" cy="13" r="1.5"></circle>
                    </svg>
                </span>
                <div class="header-content-wrapper">
                    <span class="collapse-icon">▼</span>
                    <span id="component-title-${comp.id}" class="component-title text-xs font-bold uppercase" style="color: var(--label-secondary);">${index + 1} - ${dynamicTitle}</span>
                </div>
                <div class="flex items-center" style="gap: 4px;">
                    <button type="button" class="btn btn-ghost btn-sm duplicate-comp-btn" title="Duplicate section">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm remove-comp-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${componentFormHtml}
            </div>
        `;
        
        item.querySelector('.header-content-wrapper')?.addEventListener('click', () => toggleComponent(comp.id));

        const sourceInput = item.querySelector(`[data-key="${sourceFieldKey}"]`);
        if (sourceInput) {
            sourceInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement | HTMLTextAreaElement;
                const titleEl = document.getElementById(`component-title-${comp.id}`);
                if (titleEl) {
                    const newTitle = target.value ? truncate(target.value, TRUNCATE_LENGTH) : defaultTitleText;
                    titleEl.textContent = `${index + 1} - ${newTitle}`;
                }
            });
        }


        if (comp.type === 'image' || comp.type === 'sales_offer' || comp.type === 'service_offer') {
            item.querySelectorAll('.upload-btn').forEach(uploadBtn => {
                const fileInput = uploadBtn.nextElementSibling as HTMLInputElement;
                const offerIndex = fileInput?.dataset.offerIndex || '1';
                
                uploadBtn.addEventListener('click', () => fileInput?.click());

                fileInput?.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (file) {
                        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                        if (!validTypes.includes(file.type)) {
                            showToast('Invalid file type. Use JPG, PNG, GIF, or WEBP.', 'error');
                            return;
                        }
                        if (file.size > 5 * 1024 * 1024) { // 5MB limit
                            showToast('File is too large. Max size is 5MB.', 'error');
                            return;
                        }
                        
                        const reader = new FileReader();
                        reader.onloadstart = () => {
                            uploadBtn.textContent = '...';
                            (uploadBtn as HTMLButtonElement).disabled = true;
                        };
                        reader.onload = (event) => {
                            const result = event.target?.result as string;
                            let keyToUpdate = 'src';
                            if (comp.type === 'sales_offer') keyToUpdate = offerIndex === '2' ? 'imageSrc2' : 'imageSrc';
                            if (comp.type === 'service_offer') keyToUpdate = offerIndex === '2' ? 'imageUrl2' : 'imageUrl';
                            
                            updateComponentData(comp.id, keyToUpdate, result);
                            (item.querySelector(`input[data-key="${keyToUpdate}"]`) as HTMLInputElement).value = result;
                            showToast('Image uploaded.', 'success');
                            uploadBtn.textContent = 'Upload';
                            (uploadBtn as HTMLButtonElement).disabled = false;
                        };
                        reader.onerror = () => {
                            showToast('Error reading file.', 'error');
                            uploadBtn.textContent = 'Upload';
                            (uploadBtn as HTMLButtonElement).disabled = false;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            });
        }
        
        if (comp.type === 'sales_offer') {
            item.querySelectorAll('.add-sub-offer-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const offerIndex = (btn as HTMLElement).dataset.offerIndex;
                    const offersKey = offerIndex === '2' ? 'additionalOffers2' : 'additionalOffers';
                    const current = JSON.parse(comp.data[offersKey] || '[]');
                    current.push({
                        separator: 'AND', separatorFontSize: '11', separatorFontWeight: 'normal', separatorFontStyle: 'normal', separatorColor: '#86868b', separatorBgColor: 'transparent', separatorTextAlign: 'center', separatorPaddingTop: '12', separatorPaddingBottom: '12', separatorPaddingLeftRight: '0',
                        offer: 'Additional Offer Title', offerFontSize: '14', offerFontWeight: 'normal', offerFontStyle: 'normal', offerColor: comp.data.mainOfferColor || '#007aff', offerBgColor: 'transparent', offerTextAlign: 'center', offerPaddingTop: '0', offerPaddingBottom: '4', offerPaddingLeftRight: '0',
                        details: 'Details for the additional offer.', detailsFontSize: '10', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsColor: comp.data.detailsColor || '#6e6e73', detailsBgColor: 'transparent', detailsTextAlign: 'center', detailsPaddingTop: '0', detailsPaddingBottom: '4', detailsPaddingLeftRight: '0',
                    });
                    updateComponentData(comp.id, offersKey, JSON.stringify(current));
                    renderComponents();
                });
            });

            item.querySelectorAll('.remove-sub-offer').forEach(btn => {
                btn.addEventListener('click', () => {
                    const offerIndex = (btn as HTMLElement).dataset.offerIndex;
                    const offersKey = offerIndex === '2' ? 'additionalOffers2' : 'additionalOffers';
                    const idx = parseInt(btn.getAttribute('data-index') || '0');
                    const current = JSON.parse(comp.data[offersKey] || '[]');
                    current.splice(idx, 1);
                    updateComponentData(comp.id, offersKey, JSON.stringify(current));
                    renderComponents();
                });
            });

            item.querySelectorAll('.sub-offer-field').forEach(input => {
                input.addEventListener('input', (e: any) => {
                    const target = e.target;
                    const offerIndex = (target as HTMLElement).dataset.offerIndex;
                    const offersKey = offerIndex === '2' ? 'additionalOffers2' : 'additionalOffers';
                    const idx = parseInt(target.getAttribute('data-index') || '0');
                    const field = target.getAttribute('data-field');
                    if (!field) return;

                    const current = JSON.parse(comp.data[offersKey] || '[]');
                    current[idx][field] = target.value;
                    
                    if (target.type === 'color') {
                        const swatch = target.nextElementSibling as HTMLElement;
                        if (swatch) swatch.style.background = target.value;
                    }
                    updateComponentData(comp.id, offersKey, JSON.stringify(current));
                });
            });
        }

        item.querySelectorAll('input, textarea, select, button.layout-toggle').forEach(input => {
            if (!input.classList.contains('sub-offer-field')) {
                const eventType = (input.tagName === 'BUTTON' || (input as HTMLInputElement).type === 'checkbox') ? 'click' : 'input';
                input.addEventListener(eventType, (e) => {
                    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement;
                    const key = target.getAttribute('data-key');
                    if (key) {
                        let value = target.value;
                        if (target.tagName === 'BUTTON') {
                            value = (target as HTMLButtonElement).dataset.value || '';
                        }
                        if ((target as HTMLInputElement).type === 'checkbox') {
                           value = ((target as HTMLInputElement).checked).toString();
                        }
                        
                        updateComponentData(comp.id, key, value);

                        if ((comp.type === 'sales_offer' || comp.type === 'service_offer') && key === 'layout') {
                            renderComponents();
                        }
                        
                        if (comp.type === 'sales_offer' && key === 'layout' && value !== 'grid') {
                            const newAlignment = value;
                            
                            const prefixes = ['vehicle', 'mainOffer', 'details', 'stockVin', 'mileage', 'disclaimer'];
                            prefixes.forEach(prefix => {
                                updateComponentData(comp.id, `${prefix}TextAlign`, newAlignment);
                            });

                            updateComponentData(comp.id, 'btnAlign', newAlignment);

                            try {
                                const offers = JSON.parse(comp.data.additionalOffers || '[]');
                                const updatedOffers = offers.map((offer: any) => ({
                                    ...offer,
                                    separatorTextAlign: newAlignment,
                                    offerTextAlign: newAlignment,
                                    detailsTextAlign: newAlignment,
                                    disclaimerTextAlign: newAlignment
                                }));
                                updateComponentData(comp.id, 'additionalOffers', JSON.stringify(updatedOffers));
                            } catch (error) {
                                console.error("Failed to update sub-offer alignments:", error);
                            }
                            renderStylingPanel();
                        }

                        if (target.type === 'color') {
                           const swatch = (target.parentElement as HTMLElement).querySelector('.color-swatch-display') as HTMLElement;
                           if(swatch) swatch.style.background = target.value;
                        }

                        if (key.startsWith('imageEnabled') || key.startsWith('showImage')) {
                            const offerSuffix = key.endsWith('2') ? '2' : '';
                            const containerId = key.startsWith('showImage')
                                ? `#service-image-fields-${comp.id}-${offerSuffix || '1'}`
                                : `#image-fields-container-${comp.id}-${offerSuffix || '1'}`;
                            const fieldsContainer = item.querySelector(containerId) as HTMLElement;
                            if (fieldsContainer) {
                                fieldsContainer.style.display = (target as HTMLInputElement).checked ? 'flex' : 'none';
                            }
                        }
                    }
                });
            }
        });

        item.querySelectorAll('.format-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key') as string;
                const onVal = btn.getAttribute('data-val-on') as string;
                const offVal = btn.getAttribute('data-val-off') as string;
                const currentVal = comp.data[key];
                const newVal = currentVal === onVal ? offVal : onVal;
                
                updateComponentData(comp.id, key, newVal);
                btn.classList.toggle('active');
            });
        });

        item.querySelector('.duplicate-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateComponent(comp.id);
        });

        item.querySelector('.remove-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            removeComponent(comp.id)
        });
        componentsContainer.appendChild(item);
    });

    initializeDragAndDrop();
};

function initializeDragAndDrop() {
    const components = componentsContainer.querySelectorAll('.component-item');

    components.forEach(comp => {
        comp.addEventListener('dragstart', (e) => {
            draggedComponentId = comp.getAttribute('data-id');
            setTimeout(() => {
                comp.classList.add('dragging');
            }, 0);
        });

        comp.addEventListener('dragend', () => {
            comp.classList.remove('dragging');
            draggedComponentId = null;
            document.querySelectorAll('.component-item.drag-over').forEach(c => c.classList.remove('drag-over'));
        });

        comp.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetComponent = e.currentTarget as HTMLElement;
            if (targetComponent.getAttribute('data-id') !== draggedComponentId) {
                if (!targetComponent.classList.contains('drag-over')) {
                    document.querySelector('.drag-over')?.classList.remove('drag-over');
                    targetComponent.classList.add('drag-over');
                }
            }
        });

        comp.addEventListener('dragleave', (e) => {
            (e.currentTarget as HTMLElement).classList.remove('drag-over');
        });

        comp.addEventListener('drop', (e) => {
            e.preventDefault();
            const droppedOnComponent = e.currentTarget as HTMLElement;
            droppedOnComponent.classList.remove('drag-over');

            const droppedOnId = droppedOnComponent.getAttribute('data-id');

            if (draggedComponentId && draggedComponentId !== droppedOnId) {
                const draggedIndex = activeComponents.findIndex(c => c.id === draggedComponentId);
                const droppedOnIndex = activeComponents.findIndex(c => c.id === droppedOnId);

                if (draggedIndex > -1 && droppedOnIndex > -1) {
                    const [draggedItem] = activeComponents.splice(draggedIndex, 1);
                    activeComponents.splice(droppedOnIndex, 0, draggedItem);
                    
                    saveToHistory();
                    saveDraft();
                    renderComponents();
                }
            }
        });
    });
}

function generateEmailHtml(): string {
  let sectionsHtml = '';
  
  activeComponents.forEach(comp => {
    const d = comp.data || {};
    const isTransparent = d.backgroundColor === 'transparent';
    
    if (comp.type === 'header' || comp.type === 'text_block') {
      const styles = [
          `padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px`,
          `background-color: ${d.backgroundColor || 'transparent'}`,
          `color: ${d.textColor || '#000'}`,
          `font-size: ${d.fontSize || 16}px`,
          `text-align: ${d.textAlign || 'left'}`,
          `font-weight: ${d.fontWeight || 'normal'}`,
          `font-style: ${d.fontStyle || 'normal'}`,
          `line-height: 1.5`,
          `font-family: ${designSettings.fontFamily}`
      ].join(';');
      
      const txt = DOMPurify.sanitize(d.text || '');
      sectionsHtml += `
        <tr>
            <td align="${d.textAlign || 'left'}" bgcolor="${isTransparent ? '' : d.backgroundColor}" style="${styles}">
                <div style="font-family: ${designSettings.fontFamily}; color: ${d.textColor || '#000'}; font-size: ${d.fontSize || 16}px;">
                    ${txt.replace(/\n/g, '<br>')}
                </div>
            </td>
        </tr>
      `;
    } else if (comp.type === 'image') {
        const numericWidth = parseFloat((d.width || '100%').replace(/%/g, '')) || 100;
        const styleWidth = `${numericWidth}%`;
        const imgStyles = [`display: block`, `max-width: 100%`, `width: ${styleWidth}`, `height: auto`, `border: 0`, `margin: ${d.align === 'center' ? '0 auto' : '0'}`].join(';');
        let imgTag = `<img src="${DOMPurify.sanitize(d.src || '')}" alt="${DOMPurify.sanitize(d.alt || 'Image')}" style="${imgStyles}" border="0" />`;
        if (d.link) imgTag = `<a href="${DOMPurify.sanitize(d.link)}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
        sectionsHtml += `
            <tr>
                <td align="${d.align || 'center'}" bgcolor="${isTransparent ? '' : d.backgroundColor}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    <div style="display: block; width: 100%; max-width: ${styleWidth};">${imgTag}</div>
                </td>
            </tr>
        `;
    } else if (comp.type === 'button') {
        const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
        const isOutlined = designSettings.buttonStyle === 'outlined';
        let tableWidthAttr = "100%";
        const widthType = d.widthType || 'full';
        if (widthType === 'auto') tableWidthAttr = "";
        else if (widthType === 'small') tableWidthAttr = "160";
        else if (widthType === 'medium') tableWidthAttr = "280";
        else if (widthType === 'large') tableWidthAttr = "400";
        
        const btnStyles = [`background-color: ${isOutlined ? 'transparent' : d.backgroundColor}`, `color: ${isOutlined ? d.backgroundColor : d.textColor}`, `padding: ${d.paddingTop || 12}px ${d.paddingLeftRight || '20'}px ${d.paddingBottom || 12}px`, `text-decoration: none`, `display: block`, `font-weight: bold`, `border-radius: ${radius}`, `font-size: ${d.fontSize}px`, `font-family: ${designSettings.fontFamily}`, `text-align: center`, isOutlined ? `border: 2px solid ${d.backgroundColor}` : 'border: 0'].join(';');
        
        const widthStyle = widthType === 'full' ? '100%' : (tableWidthAttr ? `${tableWidthAttr}px` : 'auto');

        sectionsHtml += `
            <tr>
                <td align="${d.align || 'center'}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    <table border="0" cellspacing="0" cellpadding="0" ${tableWidthAttr ? `width="${tableWidthAttr}"` : ""} style="margin: ${d.align === 'center' ? '0 auto' : '0'}; width: ${widthStyle}; max-width: 100%;">
                        <tr>
                            <td align="center" bgcolor="${isOutlined ? 'transparent' : d.backgroundColor}" style="border-radius: ${radius};">
                                <a href="${DOMPurify.sanitize(d.link || '#')}" target="_blank" style="${btnStyles}">${DOMPurify.sanitize(d.text || 'Button')}</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    } else if (comp.type === 'divider') {
        const { width, thickness, lineColor, alignment, paddingTop, paddingBottom, paddingLeftRight } = d;
        const alignValue = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center';

        sectionsHtml += `
          <tr>
            <td style="padding: ${paddingTop}px ${paddingLeftRight || '0'}px ${paddingBottom}px ${paddingLeftRight || '0'}px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="${alignValue}">
                    <table role="presentation" width="${width}%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td height="${thickness}" style="height: ${thickness}px; background-color: ${lineColor}; line-height: ${thickness}px; font-size: ${thickness}px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
    } else if (comp.type === 'spacer') {
        const { height, backgroundColor, matchEmailBackground } = d;
        const bgColor = matchEmailBackground === 'true' ? 'transparent' : backgroundColor;
        const bgStyle = bgColor !== 'transparent' ? `background-color: ${bgColor};` : '';
        
        sectionsHtml += `
            <tr>
                <td style="height: ${height}px; line-height: ${height}px; font-size: 0; ${bgStyle}">
                    &nbsp;
                </td>
            </tr>
        `;
    } else if (comp.type === 'service_offer') {
        const generateOfferContent = (data: Record<string, string>, suffix = '') => {
            let contentBlocks = '';
            // Image
            if (data[`showImage${suffix}`] === 'true' && data[`imageUrl${suffix}`]) {
                const imgStyles = `display: block; width: ${data[`imageWidth${suffix}`] || '100'}%; max-width: 100%; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;`;
                let imgTag = `<img src="${DOMPurify.sanitize(data[`imageUrl${suffix}`])}" alt="${DOMPurify.sanitize(data[`imageAlt${suffix}`] || '')}" style="${imgStyles}" />`;
                if (data[`imageLink${suffix}`]) {
                    imgTag = `<a href="${DOMPurify.sanitize(data[`imageLink${suffix}`])}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
                }
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`imageAlignment${suffix}`] || 'center'}" style="padding: ${data[`imagePaddingTop${suffix}`] || 10}px 0 ${data[`imagePaddingBottom${suffix}`] || 10}px 0;">${imgTag}</td></tr></table>`;
            }
            // Title
            if (data[`serviceTitle${suffix}`]) {
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`titleAlignment${suffix}`] || 'center'}" style="padding: ${data[`titlePaddingTop${suffix}`] || 10}px ${data[`titlePaddingLeftRight${suffix}`] || '0'}px ${data[`titlePaddingBottom${suffix}`] || 10}px ${data[`titlePaddingLeftRight${suffix}`] || '0'}px; font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`titleFontSize${suffix}`]}px; font-weight: ${data[`titleFontWeight${suffix}`]}; font-style: ${data[`titleFontStyle${suffix}`] || 'normal'}; color: ${data[`titleTextColor${suffix}`]}; line-height: 1.2;">${DOMPurify.sanitize(data[`serviceTitle${suffix}`])}</td></tr></table>`;
            }
            // Coupon
            if (data[`couponCode${suffix}`]) {
                const couponBorderStyle = data[`couponShowBorder${suffix}`] === 'true' ? `border: 1px ${data[`couponBorderStyle${suffix}`]} ${data[`couponBorderColor${suffix}`]};` : '';
                const couponPaddingLR = data[`couponPaddingLeftRight${suffix}`] || data[`couponPaddingLeft${suffix}`] || '16';
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`couponAlignment${suffix}`] || 'center'}" style="padding: 10px 0;"><table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;"><tr><td align="center" style="font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`couponFontSize${suffix}`]}px; font-weight: ${data[`couponFontWeight${suffix}`]}; font-style: ${data[`couponFontStyle${suffix}`] || 'normal'}; color: ${data[`couponTextColor${suffix}`]}; background-color: ${data[`couponBgColor${suffix}`]}; padding: ${data[`couponPaddingTop${suffix}`]}px ${couponPaddingLR}px ${data[`couponPaddingBottom${suffix}`]}px ${couponPaddingLR}px; ${couponBorderStyle}; line-height: 1.2;">${DOMPurify.sanitize(data[`couponCode${suffix}`])}</td></tr></table></td></tr></table>`;
            }
            // Details
            if (data[`serviceDetails${suffix}`]) {
                const sanitizedDetails = DOMPurify.sanitize(data[`serviceDetails${suffix}`]).replace(/\n/g, '<br>');
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`detailsAlignment${suffix}`] || 'center'}" style="padding: ${data[`detailsPaddingTop${suffix}`] || 12}px ${data[`detailsPaddingLeftRight${suffix}`] || '0'}px ${data[`detailsPaddingBottom${suffix}`] || 12}px ${data[`detailsPaddingLeftRight${suffix}`] || '0'}px; font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`detailsFontSize${suffix}`]}px; font-weight: ${data[`detailsFontWeight${suffix}`] || 'normal'}; font-style: ${data[`detailsFontStyle${suffix}`] || 'normal'}; color: ${data[`detailsTextColor${suffix}`]}; line-height: ${data[`detailsLineHeight${suffix}`]};">${sanitizedDetails}</td></tr></table>`;
            }
            // Button
            if (data[`buttonText${suffix}`]) {
                 const getButtonWidthForHtml = (widthType: string | undefined): string => {
                    switch(widthType) {
                        case 'full': return '100%'; case 'small': return '160px'; case 'medium': return '280px'; case 'large': return '400px'; case 'auto': return 'auto';
                        default: return widthType || 'auto';
                    }
                };
                const buttonWidth = getButtonWidthForHtml(data[`buttonWidth${suffix}`]);
                const btnRadius = designSettings.buttonStyle === 'pill' ? '9999px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
                const isOutlined = designSettings.buttonStyle === 'outlined';
                const sanitizedButtonLink = DOMPurify.sanitize(data[`buttonLink${suffix}`] || '#');
                const sanitizedButtonText = DOMPurify.sanitize(data[`buttonText${suffix}`]);
                const buttonBgColor = data[`buttonBgColor${suffix}`] || '#0066FF';
                const buttonTextColor = data[`buttonTextColor${suffix}`] || '#FFFFFF';
                let aStylesList = [`background-color: ${isOutlined ? 'transparent' : buttonBgColor}`,`color: ${isOutlined ? buttonBgColor : buttonTextColor}`,`display: block`,`font-family: ${designSettings.fontFamily}, Arial, sans-serif`,`font-size: ${data[`buttonFontSize${suffix}`] || '16'}px`,`font-weight: bold`,`text-decoration: none`,`border-radius: ${btnRadius}`,isOutlined ? `border: 2px solid ${buttonBgColor}` : 'border: 0',`text-align: center`,`line-height: 1.2`,`box-sizing: border-box`,`-webkit-text-size-adjust: none`,];
                if (buttonWidth === 'auto') aStylesList.push(`padding: ${data[`buttonPaddingTop${suffix}`] || '12'}px ${data[`buttonPaddingLeftRight${suffix}`] || '24'}px ${data[`buttonPaddingBottom${suffix}`] || '12'}px`);
                else aStylesList.push(`padding: ${data[`buttonPaddingTop${suffix}`] || '12'}px 0 ${data[`buttonPaddingBottom${suffix}`] || '12'}px 0`, `width: 100%`);
                const aStyles = aStylesList.join('; ');
                const vmlHeight = (parseInt(data[`buttonPaddingTop${suffix}`] || '12') + parseInt(data[`buttonPaddingBottom${suffix}`] || '12') + parseInt(data[`buttonFontSize${suffix}`] || '16')) * 1.3;
                let vmlWidthStyle = buttonWidth !== 'auto' ? `width:${buttonWidth};` : '';
                const vmlArcSize = btnRadius.includes('px') ? `${Math.min(50, (parseInt(btnRadius) / (vmlHeight/2)) * 100)}%` : '8%';
                const vmlButton = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${sanitizedButtonLink}" style="height:${vmlHeight}px;v-text-anchor:middle;${vmlWidthStyle}" arcsize="${vmlArcSize}" strokecolor="${isOutlined ? buttonBgColor : 'none'}" strokeweight="${isOutlined ? '2px' : '0'}" fillcolor="${isOutlined ? 'transparent' : buttonBgColor}"><w:anchorlock/><center style="color:${isOutlined ? buttonBgColor : buttonTextColor};font-family:Arial,sans-serif;font-size:${data[`buttonFontSize${suffix}`]}px;font-weight:bold;">${sanitizedButtonText}</center></v:roundrect><![endif]-->`;
                const htmlButton = `<!--[if !mso]><!--><a href="${sanitizedButtonLink}" style="${aStyles}" target="_blank">${sanitizedButtonText}</a><!--<![endif]-->`;
                let buttonContent = `${vmlButton}${htmlButton}`;
                if (buttonWidth !== '100%') {
                    const tableWidth = buttonWidth === 'auto' ? 'auto' : buttonWidth;
                    buttonContent = `<table cellpadding="0" cellspacing="0" border="0" style="width: ${tableWidth};"><tr><td align="center">${vmlButton}${htmlButton}</td></tr></table>`;
                }
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`buttonAlignment${suffix}`] || 'center'}" style="padding: 12px 0;">${buttonContent}</td></tr></table>`;
            }
            // Disclaimer
            if (data[`disclaimer${suffix}`]) {
                const sanitizedDisclaimer = DOMPurify.sanitize(data[`disclaimer${suffix}`]).replace(/\n/g, '<br>');
                contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${data[`disclaimerAlignment${suffix}`] || 'center'}" style="padding: ${data[`disclaimerPaddingTop${suffix}`] || 8}px ${data[`disclaimerPaddingLeftRight${suffix}`] || '0'}px ${data[`disclaimerPaddingBottom${suffix}`] || 8}px ${data[`disclaimerPaddingLeftRight${suffix}`] || '0'}px; font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${data[`disclaimerFontSize${suffix}`]}px; font-weight: ${data[`disclaimerFontWeight${suffix}`] || 'normal'}; font-style: ${data[`disclaimerFontStyle${suffix}`] || 'normal'}; color: ${data[`disclaimerTextColor${suffix}`]}; line-height: 1.4;">${sanitizedDisclaimer}</td></tr></table>`;
            }
            return contentBlocks;
        };

        const containerPadding = `padding: ${d.containerPaddingTop}px ${d.containerPaddingRight}px ${d.containerPaddingBottom}px ${d.containerPaddingLeft}px;`;
        
        if (d.layout === 'grid') {
            const offer1Html = generateOfferContent(d, '');
            const offer2Html = generateOfferContent(d, '2');
            sectionsHtml += `
                <tr>
                    <td align="center" style="${containerPadding}">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td width="50%" class="mobile-stack" valign="top" style="width: 50%; padding-right: 10px; vertical-align: top;">
                                    ${offer1Html}
                                </td>
                                <td width="50%" class="mobile-stack" valign="top" style="width: 50%; padding-left: 10px; vertical-align: top;">
                                    ${offer2Html}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        } else {
            const offerHtml = generateOfferContent(d, '');
            sectionsHtml += `
                <tr>
                    <td align="center" style="${containerPadding}">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                            <tr>
                                <td style="padding: 20px;">
                                    ${offerHtml}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        }
    } else if (comp.type === 'sales_offer') {
        const renderSalesOfferContent = (data: Record<string, string>, suffix: string) => {
            const rawAddOffers = JSON.parse(data[`additionalOffers${suffix}`] || '[]');
            const addOffers = rawAddOffers.map((o: any) => ({
                ...o,
                separator: DOMPurify.sanitize(o.separator || ''),
                offer: DOMPurify.sanitize(o.offer || ''),
                details: DOMPurify.sanitize(o.details || ''),
                disclaimer: DOMPurify.sanitize(o.disclaimer || '')
            }));
            let detailsHtml = '';

            const renderField = (options: any) => {
                if (!options.text) return '';
                const { text, fontSize, color, bgColor, fontWeight, fontStyle, textAlign, paddingTop, paddingBottom, paddingLeftRight } = options;
                const padding = `padding: ${paddingTop || 0}px ${paddingLeftRight || 0}px ${paddingBottom || 0}px ${paddingLeftRight || 0}px;`;
                const style = [`font-family: ${designSettings.fontFamily}`,`color: ${color || '#000'}`,`font-size: ${fontSize || 14}px`,`background-color: ${bgColor === 'transparent' ? 'transparent' : bgColor}`,`font-weight: ${fontWeight || 'normal'}`,`font-style: ${fontStyle || 'normal'}`,`text-align: ${textAlign || 'center'}`,padding,`line-height: 1.2`].join(';');
                return `<div style="${style}">${text.replace(/\n/g, '<br>')}</div>`;
            };

            detailsHtml += renderField({ text: DOMPurify.sanitize(data[`vehicleText${suffix}`]), fontSize: data[`vehicleFontSize${suffix}`], color: data[`vehicleColor${suffix}`], bgColor: data[`vehicleBgColor${suffix}`], fontWeight: 'bold', fontStyle: data[`vehicleFontStyle${suffix}`], textAlign: data[`vehicleTextAlign${suffix}`], paddingTop: data[`vehiclePaddingTop${suffix}`], paddingBottom: data[`vehiclePaddingBottom${suffix}`], paddingLeftRight: data[`vehiclePaddingLeftRight${suffix}`] });
            detailsHtml += renderField({ text: DOMPurify.sanitize(data[`mainOfferText${suffix}`]), fontSize: data[`mainOfferFontSize${suffix}`], color: data[`mainOfferColor${suffix}`], bgColor: data[`mainOfferBgColor${suffix}`], fontWeight: '800', fontStyle: data[`mainOfferFontStyle${suffix}`], textAlign: data[`mainOfferTextAlign${suffix}`], paddingTop: data[`mainOfferPaddingTop${suffix}`], paddingBottom: data[`mainOfferPaddingBottom${suffix}`], paddingLeftRight: data[`mainOfferPaddingLeftRight${suffix}`] });
            detailsHtml += renderField({ text: DOMPurify.sanitize(data[`detailsText${suffix}`]), fontSize: data[`detailsFontSize${suffix}`], color: data[`detailsColor${suffix}`], bgColor: data[`detailsBgColor${suffix}`], fontWeight: data[`detailsFontWeight${suffix}`], fontStyle: data[`detailsFontStyle${suffix}`], textAlign: data[`detailsTextAlign${suffix}`], paddingTop: data[`detailsPaddingTop${suffix}`], paddingBottom: data[`detailsPaddingBottom${suffix}`], paddingLeftRight: data[`detailsPaddingLeftRight${suffix}`] });

            addOffers.forEach((o: any) => {
                detailsHtml += renderField({ text: o.separator, fontSize: o.separatorFontSize, color: o.separatorColor, bgColor: o.separatorBgColor, fontWeight: o.separatorFontWeight, fontStyle: o.separatorFontStyle, textAlign: o.separatorTextAlign, paddingTop: o.separatorPaddingTop, paddingBottom: o.separatorPaddingBottom, paddingLeftRight: o.separatorPaddingLeftRight });
                detailsHtml += renderField({ text: o.offer, fontSize: o.offerFontSize, color: o.offerColor, bgColor: o.offerBgColor, fontWeight: o.offerFontWeight, fontStyle: o.offerFontStyle, textAlign: o.offerTextAlign, paddingTop: o.offerPaddingTop, paddingBottom: o.offerPaddingBottom, paddingLeftRight: o.offerPaddingLeftRight });
                detailsHtml += renderField({ text: o.details, fontSize: o.detailsFontSize, color: o.detailsColor, bgColor: o.detailsBgColor, fontWeight: o.detailsFontWeight, fontStyle: o.detailsFontStyle, textAlign: o.detailsTextAlign, paddingTop: o.detailsPaddingTop, paddingBottom: o.detailsPaddingBottom, paddingLeftRight: o.detailsPaddingLeftRight });
                detailsHtml += renderField({ text: o.disclaimer, fontSize: o.disclaimerFontSize, color: o.disclaimerColor, bgColor: o.disclaimerBgColor, fontWeight: o.disclaimerFontWeight, fontStyle: o.disclaimerFontStyle, textAlign: o.disclaimerTextAlign, paddingTop: o.disclaimerPaddingTop, paddingBottom: o.disclaimerPaddingBottom, paddingLeftRight: o.disclaimerPaddingLeftRight });
            });

            let finalStockVinText = '';
            const sanitizedStockVin = DOMPurify.sanitize(data[`stockVinValue${suffix}`] || '');
            if (sanitizedStockVin.trim() !== '') {
                const label = data[`stockVinType${suffix}`] === 'stock' ? 'Stock #:' : 'VIN:';
                finalStockVinText = `${label} ${sanitizedStockVin.trim()}`;
            }
            detailsHtml += renderField({ text: finalStockVinText, fontSize: data[`stockVinFontSize${suffix}`], color: data[`stockVinColor${suffix}`], bgColor: data[`stockVinBgColor${suffix}`], fontWeight: data[`stockVinFontWeight${suffix}`], fontStyle: data[`stockVinFontStyle${suffix}`], textAlign: data[`stockVinTextAlign${suffix}`], paddingTop: data[`stockVinPaddingTop${suffix}`], paddingBottom: data[`stockVinPaddingBottom${suffix}`], paddingLeftRight: data[`stockVinPaddingLeftRight${suffix}`] });

            let finalMileageText = '';
            const sanitizedMileage = DOMPurify.sanitize(data[`mileageValue${suffix}`] || '');
            if (sanitizedMileage.trim() !== '') { finalMileageText = `Mileage: ${sanitizedMileage.trim()}`; }
            detailsHtml += renderField({ text: finalMileageText, fontSize: data[`mileageFontSize${suffix}`], color: data[`mileageColor${suffix}`], bgColor: data[`mileageBgColor${suffix}`], fontWeight: data[`mileageFontWeight${suffix}`], fontStyle: data[`mileageFontStyle${suffix}`], textAlign: data[`mileageTextAlign${suffix}`], paddingTop: data[`mileagePaddingTop${suffix}`], paddingBottom: data[`mileagePaddingBottom${suffix}`], paddingLeftRight: data[`mileagePaddingLeftRight${suffix}`] });

            const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
            const isOutlined = designSettings.buttonStyle === 'outlined';
            const btnBgColor = data[`btnColor${suffix}`] || '#007aff';
            const btnTextColor = data[`btnTextColor${suffix}`] || '#ffffff';
            const btnAlign = data[`btnAlign${suffix}`] || 'center';
            let btnTableWidthAttr = "100%";
            const btnWidthType = data[`btnWidthType${suffix}`] || 'full';
            if (btnWidthType === 'auto') btnTableWidthAttr = "";
            else if (btnWidthType === 'small') btnTableWidthAttr = "160";
            else if (btnWidthType === 'medium') btnTableWidthAttr = "280";
            else if (btnWidthType === 'large') btnTableWidthAttr = "400";
            let btnMargin = '16px 0 0 0';
            if (btnAlign === 'center') btnMargin = '16px auto 0';
            else if (btnAlign === 'right') btnMargin = '16px 0 0 auto';
            const btnStyles = [`background-color: ${isOutlined ? 'transparent' : btnBgColor}`,`color: ${isOutlined ? btnBgColor : btnTextColor}`,`padding: ${data[`btnPaddingTop${suffix}`] || '12'}px ${data[`btnPaddingLeftRight${suffix}`] || '20'}px ${data[`btnPaddingBottom${suffix}`] || '12'}px`,`text-decoration: none`,`display: block`,`font-weight: bold`,`border-radius: ${radius}`,`font-size: ${data[`btnFontSize${suffix}`] || 16}px`,`font-family: ${designSettings.fontFamily}`,`text-align: center`,isOutlined ? `border: 2px solid ${btnBgColor}` : 'border: 0'].join('; ');
            detailsHtml += `<table border="0" cellspacing="0" cellpadding="0" ${btnTableWidthAttr ? `width="${btnTableWidthAttr}"` : ""} style="margin: ${btnMargin}; width: ${btnWidthType === 'full' ? '100%' : (btnTableWidthAttr ? btnTableWidthAttr+'px' : 'auto')}; max-width: 100%;"><tr><td align="center" bgcolor="${isOutlined ? 'transparent' : btnBgColor}" style="border-radius: ${radius};"><a href="${DOMPurify.sanitize(data[`btnLink${suffix}`] || '#')}" target="_blank" style="${btnStyles}">${DOMPurify.sanitize(data[`btnText${suffix}`] || 'View')}</a></td></tr></table>`;
            detailsHtml += renderField({ text: DOMPurify.sanitize(data[`disclaimerText${suffix}`]), fontSize: data[`disclaimerFontSize${suffix}`], color: data[`disclaimerColor${suffix}`], bgColor: data[`disclaimerBgColor${suffix}`], fontWeight: data[`disclaimerFontWeight${suffix}`], fontStyle: data[`disclaimerFontStyle${suffix}`], textAlign: data[`disclaimerTextAlign${suffix}`], paddingTop: data[`disclaimerPaddingTop${suffix}`], paddingBottom: data[`disclaimerPaddingBottom${suffix}`], paddingLeftRight: data[`disclaimerPaddingLeftRight${suffix}`] });
            
            return detailsHtml;
        };

        const renderSalesOfferImage = (data: Record<string, string>, suffix: string, fixedWidth?: number) => {
            if (data[`imageEnabled${suffix}`] !== 'true') return '';
            const imgStyles = `display: block; width: 100%; max-width: ${fixedWidth ? `${fixedWidth}px` : '100%'}; height: auto; border: 0;`;
            let imgTag = `<img src="${DOMPurify.sanitize(data[`imageSrc${suffix}`] || '')}" alt="${DOMPurify.sanitize(data[`imageAlt${suffix}`] || 'Sales Offer')}" ${fixedWidth ? `width="${fixedWidth}"` : ''} style="${imgStyles}" border="0" />`;
            if (data[`imageLink${suffix}`]) imgTag = `<a href="${DOMPurify.sanitize(data[`imageLink${suffix}`])}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
            return imgTag;
        };
        
        const layout = d.layout || 'center';
        let offerContentHtml = '';

        if (layout === 'grid') {
            const offer1Image = renderSalesOfferImage(d, '', 280);
            const offer1Details = renderSalesOfferContent(d, '');
            const offer1Content = `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding-bottom: 20px;">${offer1Image}</td></tr><tr><td align="center">${offer1Details}</td></tr></table>`;
            
            const offer2Image = renderSalesOfferImage(d, '2', 280);
            const offer2Details = renderSalesOfferContent(d, '2');
            const offer2Content = `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding-bottom: 20px;">${offer2Image}</td></tr><tr><td align="center">${offer2Details}</td></tr></table>`;
            
            offerContentHtml = `
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td class="mobile-stack" width="50%" valign="top" style="padding-right: 10px; vertical-align: top;">${offer1Content}</td>
                        <td class="mobile-stack" width="50%" valign="top" style="padding-left: 10px; vertical-align: top;">${offer2Content}</td>
                    </tr>
                </table>
            `;
        } else { // Handle single column layouts
            const imageEnabled = d.imageEnabled === 'true';
            if (!imageEnabled) {
                offerContentHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">${renderSalesOfferContent(d, '')}</td></tr></table>`;
            } else if (layout === 'center') {
                offerContentHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding-bottom: 20px;">${renderSalesOfferImage(d, '')}</td></tr><tr><td align="center">${renderSalesOfferContent(d, '')}</td></tr></table>`;
            } else {
                const isRightLayout = layout === 'right';
                const imgColWidth = 240;
                const gutter = 20;
                const imageTd = `<td width="${imgColWidth}" class="mobile-stack mobile-padding-bottom" valign="top" style="width: ${imgColWidth}px; vertical-align: top;">${renderSalesOfferImage(d, '', imgColWidth)}</td>`;
                const contentTdLeft = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-left: ${gutter}px;">${renderSalesOfferContent(d, '')}</td>`;
                const contentTdRight = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-right: ${gutter}px;">${renderSalesOfferContent(d, '')}</td>`;
                offerContentHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${isRightLayout ? contentTdRight + imageTd : imageTd + contentTdLeft}</tr></table>`;
            }
        }

        sectionsHtml += `
            <tr>
                <td bgcolor="${d.backgroundColor || 'transparent'}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    ${offerContentHtml}
                </td>
            </tr>
        `;
    }
  });

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Email</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, a { font-family: Arial, sans-serif !important; }
        table { border-collapse: collapse; }
        .email-container { width: 600px !important; }
    </style>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles */
        body, table, td, a { 
            -webkit-text-size-adjust: 100%; 
            -ms-text-size-adjust: 100%; 
        }
        table, td { 
            mso-table-lspace: 0pt; 
            mso-table-rspace: 0pt; 
        }
        img { 
            -ms-interpolation-mode: bicubic; 
            border: 0; 
            height: auto; 
            line-height: 100%; 
            outline: none; 
            text-decoration: none; 
        }
        
        /* Body reset */
        body { 
            height: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            background-color: #f5f5f7;
            font-family: Arial, sans-serif;
        }
        
        /* Remove spaces around email on mobile */
        body, #bodyTable {
            height: 100% !important;
            margin: 0;
            padding: 0;
            width: 100% !important;
        }
        
        /* Force Outlook to provide a "view in browser" link */
        #outlook a { padding: 0; }
        
        /* Prevent Webkit and Windows Mobile from changing font sizes */
        body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        
        /* Force Hotmail to display normal line spacing */
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
            line-height: 100%;
        }
        
        /* Mobile responsive styles */
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: auto !important;
            }
            .mobile-stack {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f5f5f7;">
    <!-- 100% background wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" id="bodyTable" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f7;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 20px 0; border-collapse: collapse;">
                
                <!-- Centering wrapper for Outlook -->
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width: 600px;">
                <tr>
                <td align="center" valign="top" width="600" style="width: 600px;">
                <![endif]-->
                
                <!-- 600px container -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    
                    ${sectionsHtml || '<tr><td style="padding: 40px; text-align: center; font-family: sans-serif;">No content added yet.</td></tr>'}
                    
                </table>
                
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
                
            </td>
        </tr>
    </table>
</body>
</html>`.trim();
}

emailForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();

    if (activeComponents.length === 0) {
        showToast('Please add at least one section before generating.', 'info');
        return;
    }

    const btnText = generateBtn.querySelector('.btn-text') as HTMLElement;
    const spinner = generateBtn.querySelector('.spinner') as HTMLElement;
    const checkmark = generateBtn.querySelector('.checkmark') as HTMLElement;

    if (!btnText || !spinner || !checkmark) return;

    const formElements = Array.from(emailForm.querySelectorAll('input, textarea, select, button'));
    formElements.forEach(el => (el as HTMLButtonElement).disabled = true);

    btnText.textContent = 'Generating...';
    spinner.classList.remove('hidden');
    checkmark.classList.add('hidden');

    setTimeout(() => {
        try {
            const html = generateEmailHtml();
            const codeBlock = document.getElementById('code-block') as HTMLElement;
            if (codeBlock) codeBlock.textContent = html;
            if (previewPane) previewPane.srcdoc = html;

            outputPlaceholder.style.display = 'none';
            outputContainer.style.display = 'grid';
            
            spinner.classList.add('hidden');
            checkmark.classList.remove('hidden');
            btnText.textContent = 'Complete';
            showToast('Template Generated', 'success');

        } catch (err) {
            console.error("Generation failed:", err);
            showToast('Error generating template. Check console for details.', 'error');
            spinner.classList.add('hidden');
            btnText.textContent = 'Generate Template';
        } finally {
            setTimeout(() => {
                formElements.forEach(el => (el as HTMLButtonElement).disabled = false);
                checkmark.classList.add('hidden');
                btnText.textContent = 'Generate Template';
            }, 2000);
        }
    }, 600);
});

copyBtn?.addEventListener('click', async () => {
  const codeBlock = document.getElementById('code-block') as HTMLElement;
  try {
    await navigator.clipboard.writeText(codeBlock.textContent || '');
    showToast('Copied to clipboard', 'success');
  } catch (err) { console.error(err); }
});

downloadBtn?.addEventListener('click', () => {
    const html = generateEmailHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email_template_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('HTML file downloaded', 'success');
});

const getSavedTemplates = (): SavedTemplate[] => {
    try {
        const data = localStorage.getItem(LS_TEMPLATES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load templates", e);
        return [];
    }
};

const saveTemplate = () => {
    const name = prompt('Enter a name for this template:', `Template ${new Date().toLocaleDateString()}`);
    if (!name) return;

    const newTemplate: SavedTemplate = {
        id: Date.now().toString(),
        name,
        createdAt: new Date().toISOString(),
        designSettings: { ...designSettings },
        components: [...activeComponents]
    };

    const templates = getSavedTemplates();
    templates.unshift(newTemplate);
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
    renderSavedTemplates();
    showToast('Template saved', 'success');
};

const deleteTemplate = (id: string) => {
    const templates = getSavedTemplates().filter(t => t.id !== id);
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
    renderSavedTemplates();
    showToast('Template deleted', 'success');
};

const loadTemplate = (id: string) => {
    const templates = getSavedTemplates();
    const template = templates.find(t => t.id === id);
    if (template) {
        designSettings = { ...template.designSettings };
        activeComponents = [...template.components];
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        saveToHistory();
        renderComponents();
        saveDraft();
        showToast(`Loaded: ${template.name}`, 'success');
    }
};

const renderSavedTemplates = () => {
    const templates = getSavedTemplates();
    if (!savedTemplatesList) return;
    if (templates.length === 0) {
        savedTemplatesList.innerHTML = `<p class="text-sm" style="color: var(--label-secondary); text-align: center;">No saved templates found.</p>`;
        return;
    }
    savedTemplatesList.innerHTML = templates.map(t => `
        <div class="card" style="margin-bottom: 8px; background: var(--background-secondary);">
            <div class="card-body" style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 class="text-base font-bold">${t.name}</h4>
                    <p class="text-xs" style="color: var(--label-tertiary);">${new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-primary btn-sm load-tpl-btn" data-id="${t.id}">Load</button>
                    <button class="btn btn-ghost btn-sm del-tpl-btn" data-id="${t.id}" style="color: var(--destructive); height: 32px;">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
    
    savedTemplatesList.querySelectorAll('.load-tpl-btn').forEach(btn => {
        btn.addEventListener('click', () => loadTemplate(btn.getAttribute('data-id') || ''));
    });
    savedTemplatesList.querySelectorAll('.del-tpl-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTemplate(btn.getAttribute('data-id') || ''));
    });
};

const loadDraft = () => {
    try {
        const data = localStorage.getItem(LS_DRAFT_KEY);
        if (data) {
            const draft = JSON.parse(data);
            if (draft && draft.designSettings && Array.isArray(draft.activeComponents)) {
                designSettings = draft.designSettings;
                activeComponents = draft.activeComponents;
                if (fontSelect) fontSelect.value = designSettings.fontFamily;
                renderComponents();
            }
        }
    } catch (e) {
        console.error("Failed to load draft", e);
    }
    saveToHistory(); // Save initial state
};

const getButtonStyleSectionHtml = (): string => {
    return `
        <div class="design-option-group" id="button-style-section" style="border-top: 1px solid var(--separator-secondary); margin-top: var(--spacing-lg); padding-top: var(--spacing-lg);">
          <h4>Button Styles</h4>
          <div class="button-style-grid">
            <div class="button-style-option ${designSettings.buttonStyle === 'rounded' ? 'selected' : ''}" data-button="rounded">
              <div class="button-preview" style="background: #007aff; border-radius: 8px;">Rounded Button</div>
              <div class="text-xs" style="color: var(--label-secondary);">Modern rounded corners</div>
            </div>
            
            <div class="button-style-option ${designSettings.buttonStyle === 'pill' ? 'selected' : ''}" data-button="pill">
              <div class="button-preview" style="background: #007aff; border-radius: 20px;">Pill Button</div>
              <div class="text-xs" style="color: var(--label-secondary);">Fully rounded pill shape</div>
            </div>
            
            <div class="button-style-option ${designSettings.buttonStyle === 'square' ? 'selected' : ''}" data-button="square">
              <div class="button-preview" style="background: #007aff; border-radius: 0px;">Square Button</div>
              <div class="text-xs" style="color: var(--label-secondary);">Classic square edges</div>
            </div>
            
            <div class="button-style-option ${designSettings.buttonStyle === 'outlined' ? 'selected' : ''}" data-button="outlined">
              <div class="button-preview" style="background: transparent; border: 2px solid #007aff; color: #007aff; border-radius: 8px;">Outlined Button</div>
              <div class="text-xs" style="color: var(--label-secondary);">Outline style with border</div>
            </div>
          </div>
        </div>
    `;
};

const attachButtonStyleListeners = () => {
    const options = dynamicStylingContainer?.querySelectorAll('.button-style-option');
    if (!options) return;
    
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            designSettings.buttonStyle = opt.getAttribute('data-button') || 'rounded';
            saveDraft();
            saveToHistory();
            showToast('Button style updated', 'success');
        });
    });
};

const alignmentControlHtml = (dataStyleKey: string, currentValue: string, disabled: boolean = false) => {
    const options = ['left', 'center', 'right'];
    const buttonsHtml = options.map(opt => `
        <button 
            type="button" 
            class="toggle-btn alignment-toggle style-control ${currentValue === opt ? 'active' : ''}" 
            data-style-key="${dataStyleKey}" 
            data-value="${opt}"
            ${disabled ? 'disabled' : ''}
            title="Align ${opt}"
        >
            ${ALIGNMENT_ICONS[opt as keyof typeof ALIGNMENT_ICONS]}
        </button>
    `).join('');

    return `<div class="toggle-group">${buttonsHtml}</div>`;
};

const buttonWidthControlHtml = (currentValue: string, dataStyleKey: string): string => {
    const options = [
        { label: 'Auto', value: 'auto', indicatorWidth: '30%' },
        { label: 'Full', value: 'full', indicatorWidth: '100%' },
        { label: 'S', value: 'small', indicatorWidth: '25%' },
        { label: 'M', value: 'medium', indicatorWidth: '50%' },
        { label: 'L', value: 'large', indicatorWidth: '75%' }
    ];

    // Map old pixel/percentage values for service_offer to new keywords for UI state
    const mapOldValues = (val: string) => {
        if (!val) return 'auto';
        switch(val) {
            case '100%': return 'full';
            case '160px': return 'small';
            case '280px': return 'medium';
            case '400px': return 'large';
            default: return val; // covers auto, full, small, medium, large
        }
    };
    const mappedValue = mapOldValues(currentValue);

    const buttonsHtml = options.map(opt => `
        <button type="button" 
            class="btn-width-option style-control ${mappedValue === opt.value ? 'active' : ''}" 
            data-style-key="${dataStyleKey}" 
            data-value="${opt.value}"
            title="${opt.label}"
        >
            <span>${opt.label}</span>
            <div class="width-indicator-wrapper">
                <div class="width-indicator" style="width: ${opt.indicatorWidth};"></div>
            </div>
        </button>
    `).join('');

    return `<div class="btn-width-group">${buttonsHtml}</div>`;
};

// Moved colorPickerHtml to a higher scope to be accessible by colorControlsHtml.
const colorPickerHtml = (dataStyleKey: string, value: string, disabled: boolean = false) => {
    const disabledAttr = disabled ? 'disabled' : '';
    const onclickAttr = disabled ? '' : `onclick="this.querySelector('input[type=color]').click()"`;
    return `
        <div class="color-picker-wrapper">
            <div class="color-input-container mini" ${onclickAttr}>
                <div class="color-swatch-display" style="background-color: ${value};"></div>
                <input type="color" class="color-input-hidden style-control" data-style-key="${dataStyleKey}" value="${value}" ${disabledAttr}>
            </div>
            <input type="text" class="form-control compact color-hex-input" value="${value.toUpperCase()}" maxlength="7" ${disabledAttr}>
        </div>
    `;
};

const typographyControlsHtml = (data: Record<string, string>, keys: Record<string, string>) => {
    let html = '';
    const hasFontSize = keys.fontSize && data[keys.fontSize];
    const hasFormatting = (keys.fontWeight && data[keys.fontWeight]) || (keys.fontStyle && data[keys.fontStyle]);

    if(hasFontSize || hasFormatting) {
        html += `<div class="grid grid-cols-2">`;
        if (hasFontSize) {
            html += `
                <div class="form-group">
                    <label class="form-label">Font Size (px)</label>
                    <input type="number" class="form-control style-control" data-style-key="${keys.fontSize}" value="${data[keys.fontSize] || ''}">
                </div>
            `;
        }
        if (hasFormatting) {
             html += `
                <div class="form-group">
                    <label class="form-label">Formatting</label>
                    <div style="display: flex; gap: 6px;">
                        ${keys.fontWeight ? `<button type="button" class="btn btn-secondary format-toggle style-control ${data[keys.fontWeight] === 'bold' ? 'active' : ''}" data-style-key="${keys.fontWeight}" data-val-on="bold" data-val-off="normal" style="font-weight: 800; font-size: 15px; width: 36px; height: 36px; padding: 0; border-radius: var(--radius-md);">B</button>` : ''}
                        ${keys.fontStyle ? `<button type="button" class="btn btn-secondary format-toggle style-control ${data[keys.fontStyle] === 'italic' ? 'active' : ''}" data-style-key="${keys.fontStyle}" data-val-on="italic" data-val-off="normal" style="font-style: italic; font-size: 15px; width: 36px; height: 36px; padding: 0; border-radius: var(--radius-md);">I</button>`: ''}
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    return html;
};

const colorControlsHtml = (data: Record<string, string>, colorConfigs: { key: string, label: string }[], disabledFields: Record<string, boolean> = {}) => {
    if (!colorConfigs || colorConfigs.length === 0) return '';
    
    const colorsHtml = colorConfigs.map(config => {
        const isDisabled = disabledFields[config.key] || false;
        const value = data[config.key] === 'transparent' ? '#ffffff' : data[config.key] || '#000000';
        return `
            <div class="form-group">
                <label class="form-label">${config.label}</label>
                ${colorPickerHtml(config.key, value, isDisabled)}
            </div>
        `;
    }).join('');

    return `<div class="grid grid-cols-2">${colorsHtml}</div>`;
}

const paddingControlsHtml = (data: Record<string, string>, paddingConfigs: { key: string, label: string }[]) => {
    if (!paddingConfigs || paddingConfigs.length === 0) return '';
    const controls = paddingConfigs.map(c => `
        <div class="form-group">
            <label class="form-label">${c.label}</label>
            <input type="number" class="form-control style-control" data-style-key="${c.key}" value="${data[c.key] || 0}">
        </div>
    `).join('');
    return `<div class="grid grid-cols-3">${controls}</div>`;
};

const renderStandardStylingPanel = (
    data: Record<string, string>,
    config: Record<string, any>,
    updateFn: (key: string, value: string) => void,
    disabledFields: Record<string, boolean> = {}
) => {
    if (!dynamicStylingContainer || !activeField) return;

    const comp = activeComponents.find(c => c.id === activeField.componentId);
    if (!comp) return;

    const formattedCompType = comp.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
            <div style="display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--label-tertiary);">${formattedCompType}</span>
                <span style="color: var(--label-tertiary); font-size: 12px; padding-bottom: 2px;">›</span>
                <span style="font-size: 13px; font-weight: 600; color: var(--label-primary);">${activeField.fieldLabel}</span>
            </div>
            <button type="button" id="close-styling-panel-btn" class="btn btn-ghost" style="width: 24px; height: 24px; padding: 0; border-radius: 50%; line-height: 1;">&times;</button>
        </div>
        <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg);">
    `;

    // Typography
    if (config.typography) {
        html += typographyControlsHtml(data, config.typography);
    }

    // Colors
    if (config.colors) {
        html += colorControlsHtml(data, config.colors, disabledFields);
    }
    
    // Alignment
    if (config.alignment) {
        const key = Object.keys(config.alignment)[0];
        html += `
            <div class="form-group">
                <label class="form-label">Alignment</label>
                ${alignmentControlHtml(key, data[key] || 'center')}
            </div>
        `;
    }

    // Sizing (Width, Button Width, etc.)
    if(config.sizing) {
        let sizingGridHtml = '';
        if(config.sizing.width) {
             sizingGridHtml += `<div class="form-group"><label class="form-label">Width (%)</label><input type="number" class="form-control style-control" data-style-key="${config.sizing.width}" value="${parseInt(data[config.sizing.width] || '100', 10)}"></div>`;
        }
        if(config.sizing.thickness) {
            sizingGridHtml += `<div class="form-group"><label class="form-label">Thickness (px)</label><input type="number" class="form-control style-control" data-style-key="${config.sizing.thickness}" value="${data[config.sizing.thickness] || '2'}"></div>`;
        }
        if(config.sizing.height) {
            sizingGridHtml += `<div class="form-group"><label class="form-label">Height (px)</label><input type="number" class="form-control style-control" data-style-key="${config.sizing.height}" value="${data[config.sizing.height] || '40'}"></div>`;
        }
        if (sizingGridHtml) {
            html += `<div class="grid grid-cols-2">${sizingGridHtml}</div>`;
        }
        
        if(config.sizing.buttonWidth) {
             html += `<div class="form-group"><label class="form-label">Button Width</label>${buttonWidthControlHtml(data[config.sizing.buttonWidth], config.sizing.buttonWidth)}</div>`;
        }
    }
    
    // Padding
    if (config.padding) {
        html += paddingControlsHtml(data, config.padding);
    }

    if (config.customHtml) {
        html += config.customHtml(data);
    }

    html += `</div>`;

    if (config.showButtonStyle) {
        html += getButtonStyleSectionHtml();
    }
    
    dynamicStylingContainer.innerHTML = html;

    dynamicStylingContainer.querySelector('#close-styling-panel-btn')?.addEventListener('click', () => {
        if (activeField?.element) {
            activeField.element.classList.remove('field-active');
        }
        activeField = null;
        renderStylingPanel();
    });

    // Attach Listeners
    dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
        const inputEl = el as HTMLInputElement | HTMLButtonElement;
        const key = inputEl.dataset.styleKey;
        if (!key) return;

        if (inputEl.classList.contains('format-toggle')) {
            inputEl.addEventListener('click', () => {
                const onVal = inputEl.dataset.valOn as string;
                const offVal = inputEl.dataset.valOff as string;
                const newVal = data[key] === onVal ? offVal : onVal;
                updateFn(key, newVal);
                renderStylingPanel();
            });
        } else if (inputEl.classList.contains('alignment-toggle') || inputEl.classList.contains('btn-width-option')) {
            inputEl.addEventListener('click', () => {
                const value = inputEl.dataset.value;
                if(value) updateFn(key, value);
                renderStylingPanel();
            });
        } else {
             const eventType = (inputEl as HTMLInputElement).type === 'checkbox' ? 'change' : 'input';
             inputEl.addEventListener(eventType, () => {
                let value = (inputEl as HTMLInputElement).type === 'checkbox' ? (inputEl as HTMLInputElement).checked.toString() : inputEl.value;
                if (key.toLowerCase().includes('width') && !key.toLowerCase().includes('widthtype')) {
                    value = `${value}%`;
                }
                updateFn(key, value);
             });
        }
    });

    if (config.showButtonStyle) {
        attachButtonStyleListeners();
    }
}


const renderStylingPanel = () => {
    if (!dynamicStylingContainer || !activeField) {
        if(dynamicStylingContainer) dynamicStylingContainer.innerHTML = '';
        return;
    }

    const comp = activeComponents.find(c => c.id === activeField.componentId);
    if (!comp) {
        dynamicStylingContainer.innerHTML = '';
        return;
    }
    
    const attachColorPickerListeners = () => {
        dynamicStylingContainer.querySelectorAll('.color-picker-wrapper').forEach(wrapper => {
            const colorInput = wrapper.querySelector('.color-input-hidden') as HTMLInputElement;
            const textInput = wrapper.querySelector('.color-hex-input') as HTMLInputElement;
            const swatch = wrapper.querySelector('.color-swatch-display') as HTMLDivElement;

            if (!colorInput || !textInput || !swatch) return;

            colorInput.addEventListener('input', () => {
                const newColor = colorInput.value.toUpperCase();
                if (textInput.value.toUpperCase() !== newColor) {
                    textInput.value = newColor;
                }
                swatch.style.backgroundColor = colorInput.value;
                colorInput.dispatchEvent(new Event('input', { bubbles: true }));
            });

            textInput.addEventListener('input', () => {
                const value = textInput.value;
                if (/^#([0-9a-f]{3}){1,2}$/i.test(value)) {
                    if (colorInput.value.toUpperCase() !== value.toUpperCase()) {
                        colorInput.value = value;
                        swatch.style.backgroundColor = value;
                        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            textInput.addEventListener('blur', () => {
                if (!/^#([0-9a-f]{3}){1,2}$/i.test(textInput.value)) {
                    textInput.value = colorInput.value.toUpperCase();
                } else {
                    textInput.value = textInput.value.toUpperCase();
                }
            });
        });
    };

    const baseUpdateFn = (key: string, value: string) => updateComponentData(comp.id, key, value);

    switch (comp.type) {
        case 'header':
        case 'text_block':
            renderStandardStylingPanel(comp.data, {
                typography: { fontSize: 'fontSize', fontWeight: 'fontWeight', fontStyle: 'fontStyle'},
                colors: [
                    { key: 'textColor', label: 'Text Color' },
                    { key: 'backgroundColor', label: 'Background' }
                ],
                alignment: { textAlign: 'textAlign'},
                padding: [
                    {key: 'paddingTop', label: 'Padding T'}, 
                    {key: 'paddingBottom', label: 'Padding B'},
                    {key: 'paddingLeftRight', label: 'Padding L/R'}
                ]
            }, baseUpdateFn);
            break;

        case 'button':
             renderStandardStylingPanel(comp.data, {
                typography: { fontSize: 'fontSize' },
                colors: [
                    { key: 'backgroundColor', label: 'Button Color' },
                    { key: 'textColor', label: 'Text Color' }
                ],
                alignment: { align: 'align'},
                sizing: { buttonWidth: 'widthType' },
                padding: [
                    { key: 'paddingTop', label: 'Padding T' },
                    { key: 'paddingBottom', label: 'Padding B' },
                    { key: 'paddingLeftRight', label: 'Padding L/R' }
                ],
                showButtonStyle: true
            }, baseUpdateFn);
            break;
        
        case 'sales_offer':
            {
                let dataObject = comp.data;
                let updateFn = baseUpdateFn;
                const fieldKey = activeField.fieldKey;
                const suffix = fieldKey.endsWith('2') ? '2' : '';
                const prefix = fieldKey.replace(/2$/, '');

                if(fieldKey.startsWith('salesOfferButton')) {
                    renderStandardStylingPanel(comp.data, {
                        typography: { fontSize: `btnFontSize${suffix}` },
                        colors: [ { key: `btnColor${suffix}`, label: 'Button Color' }, { key: `btnTextColor${suffix}`, label: 'Text Color' } ],
                        alignment: { align: `btnAlign${suffix}`},
                        sizing: { buttonWidth: `btnWidthType${suffix}` },
                        padding: [ { key: `btnPaddingTop${suffix}`, label: 'Padding T' }, { key: `btnPaddingBottom${suffix}`, label: 'Padding B' }, { key: `btnPaddingLeftRight${suffix}`, label: 'Padding L/R' } ],
                        showButtonStyle: true
                    }, baseUpdateFn);
                } else {
                    if (activeField.subOfferIndex !== undefined) {
                        const offersKey = fieldKey.includes('2') ? 'additionalOffers2' : 'additionalOffers';
                        const offers = JSON.parse(comp.data[offersKey] || '[]');
                        dataObject = offers[activeField.subOfferIndex] || {};
                        updateFn = (key: string, value: string) => updateSubOfferData(comp.id, activeField.subOfferIndex as number, key, value, offersKey);
                    }
                    const finalPrefix = prefix.replace(/2$/, '');
                     renderStandardStylingPanel(dataObject, {
                        typography: { fontSize: `${finalPrefix}FontSize`, fontWeight: `${finalPrefix}FontWeight`, fontStyle: `${finalPrefix}FontStyle` },
                        colors: [ { key: `${finalPrefix}Color`, label: 'Text Color'}, { key: `${finalPrefix}BgColor`, label: 'Background'} ],
                        alignment: { textAlign: `${finalPrefix}TextAlign`},
                        padding: [ { key: `${finalPrefix}PaddingTop`, label: 'Padding T'}, { key: `${finalPrefix}PaddingBottom`, label: 'Padding B'}, { key: `${finalPrefix}PaddingLeftRight`, label: 'Padding L/R' } ]
                    }, updateFn);
                }
            }
            break;
        
        case 'service_offer':
             const serviceFieldKey = activeField.fieldKey;
             let serviceConfig = {};
             const suffix = serviceFieldKey.endsWith('2') ? '2' : '';
             const baseKey = serviceFieldKey.replace(/2$/, '');
             switch(baseKey) {
                case 'serviceOfferTitle':
                case 'serviceOfferDetails':
                case 'serviceOfferDisclaimer': {
                    const prefix = baseKey.replace('serviceOffer', '').toLowerCase();
                    serviceConfig = {
                        typography: { fontSize: `${prefix}FontSize${suffix}`, fontWeight: `${prefix}FontWeight${suffix}`, fontStyle: `${prefix}FontStyle${suffix}`},
                        colors: [{key: `${prefix}TextColor${suffix}`, label: 'Text Color'}, {key: `${prefix}BgColor${suffix}`, label: 'Background'}],
                        alignment: { textAlign: `${prefix}Alignment${suffix}`},
                        padding: [
                            {key: `${prefix}PaddingTop${suffix}`, label: 'Padding T'}, {key: `${prefix}PaddingBottom${suffix}`, label: 'Padding B'},
                            {key: `${prefix}PaddingLeftRight${suffix}`, label: 'Padding L/R'}
                        ]
                    };
                    break;
                }
                case 'serviceOfferCoupon': {
                    const prefix = 'coupon';
                    serviceConfig = {
                        typography: { fontSize: `${prefix}FontSize${suffix}`, fontWeight: `${prefix}FontWeight${suffix}`, fontStyle: `${prefix}FontStyle${suffix}`},
                        colors: [{key: `${prefix}TextColor${suffix}`, label: 'Text Color'}, {key: `${prefix}BgColor${suffix}`, label: 'Background'}],
                        alignment: { textAlign: `${prefix}Alignment${suffix}`},
                        padding: [
                            {key: `${prefix}PaddingTop${suffix}`, label: 'Padding T'}, {key: `${prefix}PaddingBottom${suffix}`, label: 'Padding B'},
                            {key: `${prefix}PaddingLeftRight${suffix}`, label: 'Padding L/R'}
                        ]
                    };
                    break;
                }
                case 'serviceOfferButton':
                    serviceConfig = {
                         typography: { fontSize: `buttonFontSize${suffix}` },
                         colors: [{key: `buttonBgColor${suffix}`, label: 'Button Color'}, {key: `buttonTextColor${suffix}`, label: 'Text Color'}],
                         alignment: { align: `buttonAlignment${suffix}`},
                         sizing: { buttonWidth: `buttonWidth${suffix}` },
                         padding: [
                            {key: `buttonPaddingTop${suffix}`, label: 'Padding T'}, {key: `buttonPaddingBottom${suffix}`, label: 'Padding B'},
                            {key: `buttonPaddingLeftRight${suffix}`, label: 'Padding L/R'}
                        ],
                         showButtonStyle: true
                    };
                    break;
                case 'serviceOfferImage':
                     serviceConfig = {
                        sizing: { width: `imageWidth${suffix}` },
                        alignment: { align: `imageAlignment${suffix}` },
                        padding: [{key: `imagePaddingTop${suffix}`, label: 'Padding T'}, {key: `imagePaddingBottom${suffix}`, label: 'Padding B'}]
                    };
                    break;
                default:
                    dynamicStylingContainer.innerHTML = `<div class="design-option-group" style="padding: 10px; text-align: center; color: var(--label-secondary); font-size: 13px;">Select a specific field to see its styling options.</div>`;
                    return;
             }
             renderStandardStylingPanel(comp.data, serviceConfig, baseUpdateFn);
             break;
        
        case 'image':
             renderStandardStylingPanel(comp.data, {
                sizing: { width: 'width'},
                alignment: { align: 'align' },
                padding: [{key: 'paddingTop', label: 'Padding T'}, {key: 'paddingBottom', label: 'Padding B'}, {key: 'paddingLeftRight', label: 'Padding L/R'}]
            }, baseUpdateFn);
            break;
        
        case 'divider': {
            const config = {
                sizing: { width: 'width', thickness: 'thickness' },
                colors: [{ key: 'lineColor', label: 'Line Color' }],
                alignment: { alignment: 'alignment' },
                padding: [
                    {key: 'paddingTop', label: 'Padding T'}, {key: 'paddingBottom', label: 'Padding B'},
                    {key: 'paddingLeftRight', label: 'Padding L/R'}
                ]
            };
            const updateFn = (key: string, value: string) => {
                baseUpdateFn(key, value);
                
                // Update live preview in form
                const previewContainer = document.querySelector(`[data-id='${comp.id}'] .divider-preview-container`);
                const previewLine = document.querySelector(`[data-id='${comp.id}'] .divider-preview-line`) as HTMLElement;

                if (previewContainer && previewLine) {
                    const currentData = activeComponents.find(c => c.id === comp.id)?.data;
                    if (!currentData) return;
                    previewLine.style.width = `${currentData.width}%`;
                    previewLine.style.height = `${currentData.thickness}px`;
                    previewLine.style.backgroundColor = currentData.lineColor;
                    previewContainer.setAttribute('data-alignment', currentData.alignment);
                    (previewContainer as HTMLElement).style.paddingTop = `${currentData.paddingTop}px`;
                    (previewContainer as HTMLElement).style.paddingBottom = `${currentData.paddingBottom}px`;
                }
            };
            renderStandardStylingPanel(comp.data, config, updateFn);
            break;
        }

        case 'spacer': {
            const matchBg = comp.data.matchEmailBackground === 'true';
            const config = {
                sizing: { height: 'height' },
                colors: [{ key: 'backgroundColor', label: 'Background'}],
                customHtml: (d: Record<string,string>) => `
                    <div class="form-group" style="display: flex; align-items: center; gap: var(--spacing-sm);">
                        <input type="checkbox" id="match-bg-checkbox" class="style-control" data-style-key="matchEmailBackground" ${d.matchEmailBackground === 'true' ? 'checked' : ''} style="width: auto; height: auto;">
                        <label for="match-bg-checkbox" class="form-label" style="margin-bottom: 0;">Match Email Background</label>
                    </div>
                `
            };
            const updateFn = (key: string, value: string) => {
                baseUpdateFn(key, value);
                if (key === 'matchEmailBackground') {
                    renderStylingPanel();
                }
                const preview = document.querySelector(`[data-id='${comp.id}'] .spacer-preview`) as HTMLElement;
                const label = preview?.querySelector('.spacer-preview-label') as HTMLElement;
                if (!preview || !label) return;

                const currentData = activeComponents.find(c => c.id === comp.id)?.data;
                if(!currentData) return;

                preview.style.height = `${currentData.height}px`;
                label.textContent = `Height: ${currentData.height}px`;
                const isMatch = currentData.matchEmailBackground === 'true';
                const newBgColor = isMatch ? 'transparent' : currentData.backgroundColor;
                preview.style.backgroundColor = newBgColor;
                preview.classList.toggle('has-bg-color', !isMatch && newBgColor !== 'transparent');
            };
            renderStandardStylingPanel(comp.data, config, updateFn, { backgroundColor: matchBg });
            break;
        }

        default:
             dynamicStylingContainer.innerHTML = '';
             break;
    }
    
    attachColorPickerListeners();
};


// --- START: Keyboard Shortcut System Implementation ---

const saveToHistory = () => {
    if (commandHistoryIndex < commandHistory.length - 1) {
        commandHistory = commandHistory.slice(0, commandHistoryIndex + 1);
    }

    const currentState: CommandHistoryState = {
        designSettings: JSON.parse(JSON.stringify(designSettings)),
        activeComponents: JSON.parse(JSON.stringify(activeComponents)),
        timestamp: Date.now()
    };

    if (commandHistory.length > 0) {
        const lastState = commandHistory[commandHistory.length - 1];
        if (JSON.stringify(lastState.activeComponents) === JSON.stringify(currentState.activeComponents) &&
            JSON.stringify(lastState.designSettings) === JSON.stringify(currentState.designSettings)) {
            return;
        }
    }

    commandHistory.push(currentState);
    
    if (commandHistory.length > MAX_HISTORY_SIZE) {
        commandHistory.shift();
    }
    
    commandHistoryIndex = commandHistory.length - 1;
};

const executeUndo = () => {
    if (commandHistoryIndex > 0) {
        commandHistoryIndex--;
        const stateToRestore = JSON.parse(JSON.stringify(commandHistory[commandHistoryIndex]));
        activeComponents = stateToRestore.activeComponents;
        designSettings = stateToRestore.designSettings;
        renderComponents();
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        saveDraft();
        showToast('Undo', 'info');
    } else {
        showToast('Nothing to undo', 'info');
    }
};

const executeRedo = () => {
    if (commandHistoryIndex < commandHistory.length - 1) {
        commandHistoryIndex++;
        const stateToRestore = JSON.parse(JSON.stringify(commandHistory[commandHistoryIndex]));
        activeComponents = stateToRestore.activeComponents;
        designSettings = stateToRestore.designSettings;
        renderComponents();
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        saveDraft();
        showToast('Redo', 'info');
    } else {
        showToast('Nothing to redo', 'info');
    }
};

const moveComponent = (direction: 'up' | 'down') => {
    if (!selectedComponentId) return;
    const index = activeComponents.findIndex(c => c.id === selectedComponentId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        [activeComponents[index], activeComponents[index - 1]] = [activeComponents[index - 1], activeComponents[index]];
    } else if (direction === 'down' && index < activeComponents.length - 1) {
        [activeComponents[index], activeComponents[index + 1]] = [activeComponents[index + 1], activeComponents[index]];
    } else {
        return;
    }
    
    saveToHistory();
    renderComponents();
    saveDraft();
    setTimeout(() => {
        const el = document.querySelector(`.component-item[data-id='${selectedComponentId}']`) as HTMLElement;
        el?.focus();
    }, 50);
};

const openShortcutsModal = () => {
    const listEl = document.getElementById('shortcuts-list');
    if (!listEl) return;

    const grouped = shortcuts.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    let html = '';
    for (const category in grouped) {
        html += `<div class="shortcut-category"><h4>${category}</h4>`;
        grouped[category].forEach(s => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? 'Cmd' : 'Ctrl';
            html += `
                <div class="shortcut-item">
                    <span>${s.description}</span>
                    <div class="shortcut-keys">
                        ${s.ctrl ? `<kbd>${ctrlKey}</kbd>` : ''}
                        ${s.shift ? `<kbd>Shift</kbd>` : ''}
                        ${s.alt ? `<kbd>Alt</kbd>` : ''}
                        <kbd>${s.key === ' ' ? 'Space' : s.key.length === 1 ? s.key.toUpperCase() : s.key}</kbd>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    listEl.innerHTML = html;
    shortcutsModalOverlay?.classList.add('visible');
};

const closeShortcutsModal = () => {
    shortcutsModalOverlay?.classList.remove('visible');
};

const isTypingContext = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (isTypingContext(e)) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }
  
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
  
    const matchedShortcut = shortcuts.find(s => 
      s.key.toLowerCase() === e.key.toLowerCase() &&
      !!s.ctrl === ctrl &&
      !!s.shift === e.shiftKey &&
      !!s.alt === e.altKey &&
      (!s.condition || s.condition())
    );
  
    if (matchedShortcut) {
      e.preventDefault();
      matchedShortcut.action(e);
    }
};
  
const initKeyboardShortcuts = () => {
    shortcuts = [
        { key: 'z', ctrl: true, description: 'Undo last action', category: 'Editing', action: executeUndo },
        { key: 'z', ctrl: true, shift: true, description: 'Redo last action', category: 'Editing', action: executeRedo },
        { key: 's', ctrl: true, description: 'Save current template', category: 'General', action: () => saveTemplateBtn?.click() },
        { key: 'n', ctrl: true, description: 'Add new section', category: 'Components', action: () => addComponentBtn?.click() },
        { key: 'd', ctrl: true, description: 'Duplicate selected section', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && duplicateComponent(selectedComponentId) },
        { key: '/', shift: true, description: 'Show keyboard shortcuts', category: 'General', action: openShortcutsModal },
        { key: 'ArrowUp', description: 'Select previous section', category: 'Navigation', action: () => {
            if (!selectedComponentId) {
                selectComponent(activeComponents[activeComponents.length - 1]?.id);
            } else {
                const index = activeComponents.findIndex(c => c.id === selectedComponentId);
                if (index > 0) selectComponent(activeComponents[index - 1].id);
            }
        }},
        { key: 'ArrowDown', description: 'Select next section', category: 'Navigation', action: () => {
            if (!selectedComponentId) {
                selectComponent(activeComponents[0]?.id);
            } else {
                const index = activeComponents.findIndex(c => c.id === selectedComponentId);
                if (index < activeComponents.length - 1) selectComponent(activeComponents[index + 1].id);
            }
        }},
        { key: 'ArrowUp', ctrl: true, description: 'Move section up', category: 'Components', condition: () => !!selectedComponentId, action: () => moveComponent('up')},
        { key: 'ArrowDown', ctrl: true, description: 'Move section down', category: 'Components', condition: () => !!selectedComponentId, action: () => moveComponent('down')},
        { key: 'Delete', description: 'Delete selected section', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && removeComponent(selectedComponentId) },
        { key: 'Backspace', description: 'Delete selected section', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && removeComponent(selectedComponentId) },
        { key: 'Escape', description: 'Deselect section / Close modal', category: 'Navigation', action: () => {
            if (shortcutsModalOverlay?.classList.contains('visible')) {
                closeShortcutsModal();
            } else if (componentPickerOverlay?.classList.contains('visible')) {
                closeComponentPickerFunc();
            } else if (selectedComponentId) {
                selectComponent(null);
            }
        }},
    ];

    shortcutsModalOverlay = document.getElementById('shortcuts-modal-overlay');
    const closeShortcutsBtn = document.getElementById('close-shortcuts-modal');
    const openShortcutsBtn = document.getElementById('shortcuts-help-btn');

    openShortcutsBtn?.addEventListener('click', openShortcutsModal);
    closeShortcutsBtn?.addEventListener('click', closeShortcutsModal);
    shortcutsModalOverlay?.addEventListener('click', (e) => {
        if (e.target === shortcutsModalOverlay) closeShortcutsModal();
    });

    document.addEventListener('keydown', handleGlobalKeydown);
}

// --- END: Keyboard Shortcut System Implementation ---


saveTemplateBtn?.addEventListener('click', saveTemplate);
loadCollapsedStates();
renderMergeFieldsSidebar();
loadDraft();
renderComponents();
renderSavedTemplates();
initKeyboardShortcuts();

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

  if (target.hasAttribute('data-stylable')) {
      if (activeField?.element) {
          activeField.element.classList.remove('field-active');
      }
      
      const componentId = target.dataset.componentId;
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
            paddingBottom: '16'
        };
    } else if (type === 'spacer') {
        data = {
            height: '40',
            backgroundColor: 'transparent',
            matchEmailBackground: 'true',
        };
    } else if (type === 'service_offer') {
        data = {
            // Content
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
            // Styling
            containerPaddingTop: '20',
            containerPaddingBottom: '20',
            containerPaddingLeft: '20',
            containerPaddingRight: '20',
            imageWidth: '100',
            imageAlignment: 'center',
            imagePaddingTop: '10',
            imagePaddingBottom: '10',
            titleFontSize: '24',
            titleFontWeight: 'bold',
            titleTextColor: '#000000',
            titleBgColor: 'transparent',
            titleAlignment: 'center',
            titlePaddingTop: '10',
            titlePaddingBottom: '10',
            couponFontSize: '20',
            couponFontWeight: 'bold',
            couponTextColor: '#0066FF',
            couponBgColor: '#F0F7FF',
            couponAlignment: 'center',
            couponPaddingTop: '8',
            couponPaddingBottom: '8',
            couponPaddingLeft: '16',
            couponPaddingRight: '16',
            couponShowBorder: 'false',
            couponBorderStyle: 'dashed',
            couponBorderColor: '#0066FF',
            detailsFontSize: '16',
            detailsTextColor: '#333333',
            detailsBgColor: 'transparent',
            detailsAlignment: 'center',
            detailsLineHeight: '1.5',
            detailsPaddingTop: '12',
            detailsPaddingBottom: '12',
            disclaimerFontSize: '12',
            disclaimerTextColor: '#666666',
            disclaimerBgColor: 'transparent',
            disclaimerAlignment: 'center',
            disclaimerPaddingTop: '8',
            disclaimerPaddingBottom: '8',
            buttonFontSize: '16',
            buttonAlignment: 'center',
            buttonBgColor: '#0066FF',
            buttonTextColor: '#FFFFFF',
            buttonPaddingTop: '12',
            buttonPaddingBottom: '12',
            buttonWidth: 'auto'
        };
    } else if (type === 'sales_offer') {
        data = {
            layout: 'center',
            imageEnabled: 'true',
            imageSrc: 'https://via.placeholder.com/600x300',
            imageAlt: 'New Sales Offer',
            imageLink: '',
            imageWidth: '100%',
            
            vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}',
            vehicleFontSize: '14',
            vehicleColor: '#1d1d1f',
            vehicleBgColor: 'transparent',
            vehicleTextAlign: 'center',
            vehiclePaddingTop: '0', vehiclePaddingBottom: '8',

            mainOfferText: '$2,500 Trade-In Bonus',
            mainOfferFontSize: '18',
            mainOfferColor: '#007aff',
            mainOfferBgColor: 'transparent',
            mainOfferTextAlign: 'center',
            mainOfferPaddingTop: '0', mainOfferPaddingBottom: '8',

            detailsText: 'Upgrade your current ride today with our exclusive seasonal offer.',
            detailsFontSize: '10',
            detailsColor: '#6e6e73',
            detailsBgColor: 'transparent',
            detailsTextAlign: 'center',
            detailsPaddingTop: '0', detailsPaddingBottom: '12',

            stockVinType: 'stock',
            stockVinValue: '{{customer.last_transaction.vehicle.vin}}',
            stockVinFontSize: '11',
            stockVinColor: '#86868b',
            stockVinBgColor: 'transparent',
            stockVinTextAlign: 'center',
            stockVinPaddingTop: '10', stockVinPaddingBottom: '0',

            mileageValue: '{{customer.last_transaction.vehicle.mileage}}',
            mileageFontSize: '11',
            mileageColor: '#86868b',
            mileageBgColor: 'transparent',
            mileageTextAlign: 'center',
            mileagePaddingTop: '4', mileagePaddingBottom: '0',

            disclaimerText: '*Terms and conditions apply. Offer valid through end of month.',
            disclaimerFontSize: '10',
            disclaimerColor: '#86868b',
            disclaimerBgColor: 'transparent',
            disclaimerTextAlign: 'center',
            disclaimerPaddingTop: '16', disclaimerPaddingBottom: '0',
            
            additionalOffers: '[]',
            
            btnText: 'View Details',
            btnLink: '{{dealership.tracked_website_homepage_url}}',
            btnFontSize: '14',
            btnPaddingTop: '12',
            btnPaddingBottom: '12',
            btnColor: '#007aff',
            btnTextColor: '#ffffff',
            btnAlign: 'center',
            btnWidthType: 'full',
            
            paddingTop: '20',
            paddingBottom: '20',
            paddingLeftRight: '20',
            backgroundColor: '#ffffff'
        };
    }

    activeComponents.push({ id, type, data });
    renderComponents();
    saveDraft();
    showToast(`${type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1)} added`, 'success');
};

const removeComponent = (id: string) => {
    activeComponents = activeComponents.filter(c => c.id !== id);
    delete collapsedStates[id];
    saveCollapsedStates();
    renderComponents();
    saveDraft();
    showToast('Section removed', 'success');
};

const updateComponentData = (id: string, key: string, value: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (comp) {
        comp.data[key] = value;
        saveDraft();
    }
};

const updateSubOfferData = (componentId: string, index: number, key: string, value: string) => {
    const comp = activeComponents.find(c => c.id === componentId);
    if (comp && comp.type === 'sales_offer') {
        try {
            const offers = JSON.parse(comp.data.additionalOffers || '[]');
            if (offers[index]) {
                offers[index][key] = value;
                comp.data.additionalOffers = JSON.stringify(offers);
                saveDraft();
            }
        } catch (e) {
            console.error("Failed to update sub-offer data", e);
        }
    }
};

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
        item.setAttribute('data-id', comp.id);
        item.setAttribute('draggable', 'true');

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
            const showImage = comp.data.showImage === 'true';
            componentFormHtml = `
                <div tabindex="0" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferContainer" data-field-label="Service Offer">
                    <div class="service-offer-form">
                        <div class="form-group-inline wrap" style="border-bottom: 1px solid var(--separator-secondary); padding-bottom: var(--spacing-md);">
                            <div class="toggle-switch-group">
                                <div class="toggle-switch compact">
                                    <input type="checkbox" id="service-image-enabled-${comp.id}" class="toggle-switch-checkbox" data-key="showImage" ${showImage ? 'checked' : ''}>
                                    <label for="service-image-enabled-${comp.id}" class="toggle-switch-label"></label>
                                </div>
                                <label for="service-image-enabled-${comp.id}" class="toggle-switch-text-label">Show Image</label>
                            </div>
                            <div id="service-image-fields-${comp.id}" style="display: ${showImage ? 'flex' : 'none'}; gap: var(--spacing-md); flex: 1; flex-wrap: wrap; align-items: center;">
                                <div class="inline-input-group"><label>URL:</label><input type="text" class="form-control compact" data-key="imageUrl" value="${comp.data.imageUrl || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferImage" data-field-label="Image"></div>
                                <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                                <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp">
                                <div class="inline-input-group"><label>Alt:</label><input type="text" class="form-control compact" data-key="imageAlt" value="${comp.data.imageAlt || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferImage" data-field-label="Image"></div>
                                <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="imageLink" value="${comp.data.imageLink || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferImage" data-field-label="Image"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Service Offer Title</label>
                            <input type="text" class="form-control" data-key="serviceTitle" value="${comp.data.serviceTitle || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferTitle" data-field-label="Service Title">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Coupon Code</label>
                            <input type="text" class="form-control" data-key="couponCode" value="${comp.data.couponCode || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferCoupon" data-field-label="Coupon Code">
                        </div>
                         <div class="form-group">
                            <label class="form-label">Service Offer Details</label>
                            <textarea class="form-control" data-key="serviceDetails" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferDetails" data-field-label="Service Details" rows="3">${comp.data.serviceDetails || ''}</textarea>
                        </div>
                         <div class="form-group">
                            <label class="form-label">Disclaimer</label>
                            <textarea class="form-control" data-key="disclaimer" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferDisclaimer" data-field-label="Disclaimer" rows="2">${comp.data.disclaimer || ''}</textarea>
                        </div>
                        <div class="form-group-inline wrap">
                            <div class="inline-input-group"><label>Button Text:</label><input type="text" class="form-control compact" data-key="buttonText" value="${comp.data.buttonText || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton" data-field-label="Button"></div>
                            <div class="inline-input-group"><label>Button Link:</label><input type="text" class="form-control compact" data-key="buttonLink" value="${comp.data.buttonLink || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton" data-field-label="Button"></div>
                        </div>
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

            const addOffers = JSON.parse(comp.data.additionalOffers || '[]');
            const imageEnabled = comp.data.imageEnabled === 'true';

            componentFormHtml = `
                <div class="form-group-inline">
                    <label class="form-label-inline">Offer Layout</label>
                    <select class="form-control compact" data-key="layout">
                        <option value="left" ${comp.data.layout === 'left' ? 'selected' : ''}>Left (Image Left)</option>
                        <option value="center" ${comp.data.layout === 'center' ? 'selected' : ''}>Center (Image Top)</option>
                        <option value="right" ${comp.data.layout === 'right' ? 'selected' : ''}>Right (Image Right)</option>
                    </select>
                </div>
                
                <div class="form-group-inline wrap">
                    <div class="toggle-switch-group">
                        <div class="toggle-switch compact">
                            <input type="checkbox" id="image-enabled-${comp.id}" class="toggle-switch-checkbox" data-key="imageEnabled" ${imageEnabled ? 'checked' : ''}>
                            <label for="image-enabled-${comp.id}" class="toggle-switch-label"></label>
                        </div>
                        <label for="image-enabled-${comp.id}" class="toggle-switch-text-label">Show Image</label>
                    </div>
                    <div id="image-fields-container-${comp.id}" style="display: ${imageEnabled ? 'flex' : 'none'}; gap: var(--spacing-md); flex: 1; flex-wrap: wrap; align-items: center;">
                        <div class="inline-input-group"><label>URL:</label><input type="text" class="form-control compact" data-key="imageSrc" value="${comp.data.imageSrc || ''}"></div>
                        <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                        <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp">
                        <div class="inline-input-group"><label>Alt:</label><input type="text" class="form-control compact" data-key="imageAlt" value="${comp.data.imageAlt || ''}"></div>
                        <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="imageLink" value="${comp.data.imageLink || ''}"></div>
                    </div>
                </div>

                <div class="compact-separator"><span>Vehicle Section</span></div>
                <div class="form-group-inline vehicle-section-inline">
                     <div class="inline-input-group vehicle-input-group">
                        <label>Vehicle:</label>
                        <input type="text" class="form-control compact" data-key="vehicleText" data-stylable="true" data-component-id="${comp.id}" data-field-key="vehicle" data-field-label="Vehicle Name" value="${comp.data.vehicleText || ''}">
                    </div>
                    <div class="inline-input-group stock-vin-group">
                        <select class="form-control compact stock-vin-type" data-key="stockVinType">
                            <option value="stock" ${comp.data.stockVinType === 'stock' ? 'selected' : ''}>Stock #</option>
                            <option value="vin" ${comp.data.stockVinType === 'vin' ? 'selected' : ''}>VIN</option>
                        </select>
                        <input type="text" class="form-control compact" data-key="stockVinValue" data-stylable="true" data-component-id="${comp.id}" data-field-key="stockVin" data-field-label="Stock/VIN" value="${comp.data.stockVinValue || ''}" placeholder="Enter value">
                    </div>
                    <div class="inline-input-group mileage-input-group">
                        <label>Mileage:</label>
                        <input type="text" class="form-control compact" data-key="mileageValue" data-stylable="true" data-component-id="${comp.id}" data-field-key="mileage" data-field-label="Mileage" value="${comp.data.mileageValue || ''}" placeholder="Optional">
                    </div>
                </div>

                <div class="compact-separator"><span>Offers Section</span></div>
                <div class="form-group-inline"><label class="form-label-inline">Main Offer</label><input type="text" class="form-control compact" data-key="mainOfferText" data-stylable="true" data-component-id="${comp.id}" data-field-key="mainOffer" data-field-label="Main Offer" value="${comp.data.mainOfferText || ''}"></div>
                <div class="form-group-inline align-start"><label class="form-label-inline">Details</label><textarea class="form-control compact" data-key="detailsText" data-stylable="true" data-component-id="${comp.id}" data-field-key="details" data-field-label="Offer Details">${comp.data.detailsText || ''}</textarea></div>

                <div class="compact-separator">
                    <span>Additional Offers (${addOffers.length})</span>
                    <button type="button" class="btn btn-ghost btn-sm add-sub-offer-btn">+ Add</button>
                </div>
                <div id="additional-offers-list-${comp.id}" class="compact-offers-container">
                    ${addOffers.map((o: any, i: number) => `
                        <div class="compact-offer-item">
                            <div class="compact-offer-header">
                                <span>Offer #${i + 1}</span>
                                <button type="button" class="btn btn-ghost btn-sm remove-sub-offer" data-index="${i}">×</button>
                            </div>
                            <div class="separator-offer-row">
                                <div class="separator-group">
                                    <label class="form-label-inline">Separator</label>
                                    <input type="text" class="form-control compact sub-offer-field" data-index="${i}" data-field="separator" value="${o.separator || ''}" placeholder="AND" data-stylable="true" data-component-id="${comp.id}" data-field-key="separator" data-field-label="Separator" data-sub-offer-index="${i}">
                                </div>
                                <div class="offer-group">
                                    <label class="form-label-inline offer-label-short">Offer</label>
                                    <input type="text" class="form-control compact sub-offer-field" data-index="${i}" data-field="offer" value="${o.offer || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="offer" data-field-label="Offer" data-sub-offer-index="${i}">
                                </div>
                            </div>
                            <div class="form-group-inline align-start">
                                <label class="form-label-inline">Details</label>
                                <textarea class="form-control compact sub-offer-field" data-index="${i}" data-field="details" data-stylable="true" data-component-id="${comp.id}" data-field-key="details" data-field-label="Details" data-sub-offer-index="${i}">${o.details || ''}</textarea>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="form-group-inline align-start disclaimer-group"><label class="form-label-inline">Disclaimer</label><textarea class="form-control compact" style="height: 48px;" data-key="disclaimerText" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimer" data-field-label="Disclaimer">${comp.data.disclaimerText || ''}</textarea></div>

                <div class="compact-separator"><span>Button Settings</span></div>
                <div class="form-group-inline wrap">
                    <div class="inline-input-group"><label>Text:</label><input type="text" class="form-control compact" data-key="btnText" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton" data-field-label="Button Text" value="${comp.data.btnText || ''}"></div>
                    <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="btnLink" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton" data-field-label="Button Link" value="${comp.data.btnLink || ''}"></div>
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
                <button type="button" class="btn btn-ghost btn-sm remove-comp-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
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
            const uploadBtn = item.querySelector('.upload-btn') as HTMLButtonElement;
            const fileInput = item.querySelector('.file-input') as HTMLInputElement;

            uploadBtn?.addEventListener('click', () => {
                fileInput?.click();
            });

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
                        uploadBtn.disabled = true;
                    };
                    reader.onload = (event) => {
                        const result = event.target?.result as string;
                        let keyToUpdate = 'src';
                        if (comp.type === 'sales_offer') keyToUpdate = 'imageSrc';
                        if (comp.type === 'service_offer') keyToUpdate = 'imageUrl';
                        
                        updateComponentData(comp.id, keyToUpdate, result);
                        (item.querySelector(`input[data-key="${keyToUpdate}"]`) as HTMLInputElement).value = result;
                        showToast('Image uploaded.', 'success');
                        uploadBtn.textContent = 'Upload';
                        uploadBtn.disabled = false;
                    };
                    reader.onerror = () => {
                        showToast('Error reading file.', 'error');
                        uploadBtn.textContent = 'Upload';
                        uploadBtn.disabled = false;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        if (comp.type === 'sales_offer') {
            item.querySelector('.add-sub-offer-btn')?.addEventListener('click', () => {
                const current = JSON.parse(comp.data.additionalOffers || '[]');
                current.push({
                    separator: 'AND',
                    separatorFontSize: '11',
                    separatorColor: '#86868b',
                    separatorBgColor: 'transparent',
                    separatorTextAlign: 'center',
                    separatorPaddingTop: '12', separatorPaddingBottom: '12',
                    offer: 'Additional Offer Title',
                    offerFontSize: '14',
                    offerColor: comp.data.mainOfferColor || '#007aff',
                    offerBgColor: 'transparent',
                    offerTextAlign: 'center',
                    offerPaddingTop: '0', offerPaddingBottom: '4',
                    details: 'Details for the additional offer.',
                    detailsFontSize: '10',
                    detailsColor: comp.data.detailsColor || '#6e6e73',
                    detailsBgColor: 'transparent',
                    detailsTextAlign: 'center',
                    detailsPaddingTop: '0', detailsPaddingBottom: '4',
                });
                updateComponentData(comp.id, 'additionalOffers', JSON.stringify(current));
                renderComponents();
            });

            item.querySelectorAll('.remove-sub-offer').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-index') || '0');
                    const current = JSON.parse(comp.data.additionalOffers || '[]');
                    current.splice(idx, 1);
                    updateComponentData(comp.id, 'additionalOffers', JSON.stringify(current));
                    renderComponents();
                });
            });

            item.querySelectorAll('.sub-offer-field').forEach(input => {
                input.addEventListener('input', (e: any) => {
                    const target = e.target;
                    const idx = parseInt(target.getAttribute('data-index') || '0');
                    const field = target.getAttribute('data-field');
                    if (!field) return;

                    const current = JSON.parse(comp.data.additionalOffers || '[]');
                    current[idx][field] = target.value;
                    
                    if (target.type === 'color') {
                        const swatch = target.nextElementSibling as HTMLElement;
                        if (swatch) swatch.style.background = target.value;
                    }

                    updateComponentData(comp.id, 'additionalOffers', JSON.stringify(current));
                });
            });
        }

        item.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.classList.contains('sub-offer-field')) {
                const eventType = (input as HTMLInputElement).type === 'checkbox' ? 'change' : 'input';
                input.addEventListener(eventType, (e) => {
                    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                    const key = target.getAttribute('data-key');
                    if (key) {
                        const value = target.type === 'checkbox' ? ((target as HTMLInputElement).checked).toString() : target.value;
                        updateComponentData(comp.id, key, value);

                        if (comp.type === 'sales_offer' && key === 'layout') {
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

                        if (key === 'imageEnabled' || key === 'showImage') {
                            const containerId = (key === 'showImage') ? `#service-image-fields-${comp.id}` : `#image-fields-container-${comp.id}`;
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
        
        const btnStyles = [`background-color: ${isOutlined ? 'transparent' : d.backgroundColor}`, `color: ${isOutlined ? d.backgroundColor : d.textColor}`, `padding: ${d.paddingTop || 12}px 24px ${d.paddingBottom || 12}px`, `text-decoration: none`, `display: block`, `font-weight: bold`, `border-radius: ${radius}`, `font-size: ${d.fontSize}px`, `font-family: ${designSettings.fontFamily}`, `text-align: center`, isOutlined ? `border: 2px solid ${d.backgroundColor}` : 'border: 0'].join(';');
        
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
        const { width, thickness, lineColor, alignment, paddingTop, paddingBottom } = d;
        const alignValue = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center';

        sectionsHtml += `
          <tr>
            <td style="padding: ${paddingTop}px 0 ${paddingBottom}px 0;">
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
        const d = comp.data;
        let contentBlocks = '';

        // Image
        if (d.showImage === 'true' && d.imageUrl) {
            const imgStyles = `display: block; width: ${d.imageWidth || '100'}%; max-width: 100%; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;`;
            let imgTag = `<img src="${DOMPurify.sanitize(d.imageUrl)}" alt="${DOMPurify.sanitize(d.imageAlt || '')}" style="${imgStyles}" />`;
            if (d.imageLink) {
                imgTag = `<a href="${DOMPurify.sanitize(d.imageLink)}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
            }
            contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${d.imageAlignment}" style="padding: ${d.imagePaddingTop}px 0 ${d.imagePaddingBottom}px 0;">${imgTag}</td></tr></table>`;
        }
        
        // Title
        if (d.serviceTitle) {
            contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${d.titleAlignment}" style="font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${d.titleFontSize}px; font-weight: ${d.titleFontWeight}; color: ${d.titleTextColor}; padding: ${d.titlePaddingTop}px 0 ${d.titlePaddingBottom}px 0; line-height: 1.2;">${DOMPurify.sanitize(d.serviceTitle)}</td></tr></table>`;
        }

        // Coupon
        if (d.couponCode) {
            const couponBorderStyle = d.couponShowBorder === 'true' ? `border: 1px ${d.couponBorderStyle} ${d.couponBorderColor};` : '';
            contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${d.couponAlignment}" style="padding: 10px 0;"><table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;"><tr><td align="center" style="font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${d.couponFontSize}px; font-weight: ${d.couponFontWeight}; color: ${d.couponTextColor}; background-color: ${d.couponBgColor}; padding: ${d.couponPaddingTop}px ${d.couponPaddingLeft}px ${d.couponPaddingBottom}px ${d.couponPaddingRight}px; ${couponBorderStyle}; line-height: 1.2;">${DOMPurify.sanitize(d.couponCode)}</td></tr></table></td></tr></table>`;
        }

        // Details
        if (d.serviceDetails) {
            const sanitizedDetails = DOMPurify.sanitize(d.serviceDetails).replace(/\n/g, '<br>');
            contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${d.detailsAlignment}" style="font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${d.detailsFontSize}px; color: ${d.detailsTextColor}; line-height: ${d.detailsLineHeight}; padding: ${d.detailsPaddingTop}px 0 ${d.detailsPaddingBottom}px 0;">${sanitizedDetails}</td></tr></table>`;
        }
        
        // Button
        if (d.buttonText) {
            const btnRadius = designSettings.buttonStyle === 'pill' ? '9999px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
            const isOutlined = designSettings.buttonStyle === 'outlined';
            const buttonWidth = d.buttonWidth || 'auto';
            const sanitizedButtonLink = DOMPurify.sanitize(d.buttonLink || '#');
            const sanitizedButtonText = DOMPurify.sanitize(d.buttonText);
            const buttonBgColor = d.buttonBgColor || '#0066FF';
            const buttonTextColor = d.buttonTextColor || '#FFFFFF';

            let aStylesList = [
                `background-color: ${isOutlined ? 'transparent' : buttonBgColor}`,
                `color: ${isOutlined ? buttonBgColor : buttonTextColor}`,
                `display: block`,
                `font-family: ${designSettings.fontFamily}, Arial, sans-serif`,
                `font-size: ${d.buttonFontSize}px`,
                `font-weight: bold`,
                `text-decoration: none`,
                `border-radius: ${btnRadius}`,
                isOutlined ? `border: 2px solid ${buttonBgColor}` : 'border: 0',
                `text-align: center`,
                `line-height: 1.2`,
                `box-sizing: border-box`,
                `-webkit-text-size-adjust: none`,
            ];

            if (buttonWidth === 'auto') {
                aStylesList.push(`padding: ${d.buttonPaddingTop}px 24px ${d.buttonPaddingBottom}px 24px`);
            } else {
                aStylesList.push(`padding: ${d.buttonPaddingTop}px 0 ${d.buttonPaddingBottom}px 0`);
                aStylesList.push(`width: 100%`);
            }
            const aStyles = aStylesList.join('; ');
            
            const vmlHeight = (parseInt(d.buttonPaddingTop) + parseInt(d.buttonPaddingBottom) + parseInt(d.buttonFontSize)) * 1.3;
            let vmlWidthStyle = '';
            if (buttonWidth !== 'auto') {
                vmlWidthStyle = `width:${(buttonWidth === '100%') ? '100%' : buttonWidth};`;
            }

            const vmlArcSize = btnRadius.includes('px') ? `${Math.min(50, (parseInt(btnRadius) / (vmlHeight/2)) * 100)}%` : '8%';
            
            const vmlButton = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${sanitizedButtonLink}" style="height:${vmlHeight}px;v-text-anchor:middle;${vmlWidthStyle}" arcsize="${vmlArcSize}" strokecolor="${isOutlined ? buttonBgColor : 'none'}" strokeweight="${isOutlined ? '2px' : '0'}" fillcolor="${isOutlined ? 'transparent' : buttonBgColor}"><w:anchorlock/><center style="color:${isOutlined ? buttonBgColor : buttonTextColor};font-family:Arial,sans-serif;font-size:${d.buttonFontSize}px;font-weight:bold;">${sanitizedButtonText}</center></v:roundrect><![endif]-->`;
            const htmlButton = `<!--[if !mso]><!--><a href="${sanitizedButtonLink}" style="${aStyles}" target="_blank">${sanitizedButtonText}</a><!--<![endif]-->`;
            
            let buttonContent = `${vmlButton}${htmlButton}`;
             if (buttonWidth !== '100%') {
                buttonContent = `<table cellpadding="0" cellspacing="0" border="0" style="width: ${buttonWidth === 'auto' ? 'auto' : buttonWidth};"><tr><td align="center">${vmlButton}${htmlButton}</td></tr></table>`;
            }

            contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${d.buttonAlignment}" style="padding: 12px 0;">${buttonContent}</td></tr></table>`;
        }

        // Disclaimer
        if (d.disclaimer) {
            const sanitizedDisclaimer = DOMPurify.sanitize(d.disclaimer).replace(/\n/g, '<br>');
            contentBlocks += `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${d.disclaimerAlignment}" style="font-family: ${designSettings.fontFamily}, Arial, sans-serif; font-size: ${d.disclaimerFontSize}px; color: ${d.disclaimerTextColor}; padding: ${d.disclaimerPaddingTop}px 0 ${d.disclaimerPaddingBottom}px 0; line-height: 1.4;">${sanitizedDisclaimer}</td></tr></table>`;
        }

        const mainTableStyle = `border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;`;
        const innerPadding = '20px'; // As per user's example

        sectionsHtml += `
            <tr>
                <td align="center" style="padding: ${d.containerPaddingTop}px ${d.containerPaddingRight}px ${d.containerPaddingBottom}px ${d.containerPaddingLeft}px;">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; ${mainTableStyle}">
                        <tr>
                            <td style="padding: ${innerPadding};">
                                ${contentBlocks}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    } else if (comp.type === 'sales_offer') {
        const layout = d.layout || 'center';
        const rawAddOffers = JSON.parse(d.additionalOffers || '[]');
        const addOffers = rawAddOffers.map((o: any) => ({
            ...o,
            separator: DOMPurify.sanitize(o.separator || ''),
            offer: DOMPurify.sanitize(o.offer || ''),
            details: DOMPurify.sanitize(o.details || ''),
            disclaimer: DOMPurify.sanitize(o.disclaimer || '')
        }));
        const imageEnabled = d.imageEnabled === 'true';
        
        const renderDetails = () => {
            let detailsHtml = '';
            
            interface FieldStyleOptions {
                text: string;
                fontSize?: string;
                color?: string;
                bgColor?: string;
                fontWeight?: string;
                textAlign?: string;
                paddingTop?: string;
                paddingRight?: string;
                paddingBottom?: string;
                paddingLeft?: string;
            }
            const renderField = (options: FieldStyleOptions) => {
                if (!options.text) return '';
                const {
                    text,
                    fontSize = '14',
                    color = '#000',
                    bgColor = 'transparent',
                    fontWeight = 'normal',
                    textAlign = 'center',
                    paddingTop = '0',
                    paddingRight = '0',
                    paddingBottom = '0',
                    paddingLeft = '0'
                } = options;

                const padding = `padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px;`;

                const style = [
                    `font-family: ${designSettings.fontFamily}`,
                    `color: ${color}`,
                    `font-size: ${fontSize}px`,
                    `background-color: ${bgColor === 'transparent' ? 'transparent' : bgColor}`,
                    `font-weight: ${fontWeight}`,
                    `text-align: ${textAlign}`,
                    padding,
                    `line-height: 1.2`
                ].join(';');
                return `<div style="${style}">${text.replace(/\n/g, '<br>')}</div>`;
            };

            detailsHtml += renderField({ text: DOMPurify.sanitize(d.vehicleText), fontSize: d.vehicleFontSize, color: d.vehicleColor, bgColor: d.vehicleBgColor, fontWeight: 'bold', textAlign: d.vehicleTextAlign, paddingTop: d.vehiclePaddingTop, paddingBottom: d.vehiclePaddingBottom });
            detailsHtml += renderField({ text: DOMPurify.sanitize(d.mainOfferText), fontSize: d.mainOfferFontSize, color: d.mainOfferColor, bgColor: d.mainOfferBgColor, fontWeight: '800', textAlign: d.mainOfferTextAlign, paddingTop: d.mainOfferPaddingTop, paddingBottom: d.mainOfferPaddingBottom });
            detailsHtml += renderField({ text: DOMPurify.sanitize(d.detailsText), fontSize: d.detailsFontSize, color: d.detailsColor, bgColor: d.detailsBgColor, fontWeight: 'normal', textAlign: d.detailsTextAlign, paddingTop: d.detailsPaddingTop, paddingBottom: d.detailsPaddingBottom });
            
            addOffers.forEach((o: any) => {
                detailsHtml += renderField({ text: o.separator, fontSize: o.separatorFontSize, color: o.separatorColor, bgColor: o.separatorBgColor, fontWeight: 'bold', textAlign: o.separatorTextAlign, paddingTop: o.separatorPaddingTop, paddingBottom: o.separatorPaddingBottom });
                detailsHtml += renderField({ text: o.offer, fontSize: o.offerFontSize, color: o.offerColor, bgColor: o.offerBgColor, fontWeight: 'bold', textAlign: o.offerTextAlign, paddingTop: o.offerPaddingTop, paddingBottom: o.offerPaddingBottom });
                detailsHtml += renderField({ text: o.details, fontSize: o.detailsFontSize, color: o.detailsColor, bgColor: o.detailsBgColor, fontWeight: 'normal', textAlign: o.detailsTextAlign, paddingTop: o.detailsPaddingTop, paddingBottom: o.detailsPaddingBottom });
                detailsHtml += renderField({ text: o.disclaimer, fontSize: o.disclaimerFontSize, color: o.disclaimerColor, bgColor: o.disclaimerBgColor, fontWeight: 'normal', textAlign: o.disclaimerTextAlign, paddingTop: o.disclaimerPaddingTop, paddingBottom: o.disclaimerPaddingBottom });
            });
            
            let finalStockVinText = '';
            const sanitizedStockVin = DOMPurify.sanitize(d.stockVinValue || '');
            if (sanitizedStockVin.trim() !== '') {
                const label = d.stockVinType === 'stock' ? 'Stock #:' : 'VIN:';
                finalStockVinText = `${label} ${sanitizedStockVin.trim()}`;
            }

            let finalMileageText = '';
            const sanitizedMileage = DOMPurify.sanitize(d.mileageValue || '');
            if (sanitizedMileage.trim() !== '') {
                finalMileageText = `Mileage: ${sanitizedMileage.trim()}`;
            }

            detailsHtml += renderField({ text: finalStockVinText, fontSize: d.stockVinFontSize, color: d.stockVinColor, bgColor: d.stockVinBgColor, fontWeight: 'normal', textAlign: d.stockVinTextAlign, paddingTop: d.stockVinPaddingTop, paddingBottom: d.stockVinPaddingBottom });
            detailsHtml += renderField({ text: finalMileageText, fontSize: d.mileageFontSize, color: d.mileageColor, bgColor: d.mileageBgColor, fontWeight: 'normal', textAlign: d.mileageTextAlign, paddingTop: d.mileagePaddingTop, paddingBottom: d.mileagePaddingBottom });
            
            const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
            const isOutlined = designSettings.buttonStyle === 'outlined';
            const btnBgColor = d.btnColor || '#007aff';
            const btnTextColor = d.btnTextColor || '#ffffff';

            const btnAlign = d.btnAlign || 'center';
            let btnTableWidthAttr = "100%";
            const btnWidthType = d.btnWidthType || 'full';
            if (btnWidthType === 'auto') btnTableWidthAttr = "";
            else if (btnWidthType === 'small') btnTableWidthAttr = "160";
            else if (btnWidthType === 'medium') btnTableWidthAttr = "280";
            else if (btnWidthType === 'large') btnTableWidthAttr = "400";
            
            let btnMargin = '16px 0 0 0';
            if (btnAlign === 'center') btnMargin = '16px auto 0';
            else if (btnAlign === 'right') btnMargin = '16px 0 0 auto';

            const btnStyles = [
                `background-color: ${isOutlined ? 'transparent' : btnBgColor}`,
                `color: ${isOutlined ? btnBgColor : btnTextColor}`,
                `padding: ${d.btnPaddingTop || '12'}px 20px ${d.btnPaddingBottom || '12'}px`,
                `text-decoration: none`,
                `display: block`,
                `font-weight: bold`,
                `border-radius: ${radius}`,
                `font-size: ${d.btnFontSize || 16}px`,
                `font-family: ${designSettings.fontFamily}`,
                `text-align: center`,
                isOutlined ? `border: 2px solid ${btnBgColor}` : 'border: 0'
            ].join('; ');

            detailsHtml += `
                <table border="0" cellspacing="0" cellpadding="0" ${btnTableWidthAttr ? `width="${btnTableWidthAttr}"` : ""} style="margin: ${btnMargin}; width: ${btnWidthType === 'full' ? '100%' : (btnTableWidthAttr ? btnTableWidthAttr+'px' : 'auto')}; max-width: 100%;">
                    <tr>
                        <td align="center" bgcolor="${isOutlined ? 'transparent' : btnBgColor}" style="border-radius: ${radius};">
                            <a href="${DOMPurify.sanitize(d.btnLink || '#')}" target="_blank" style="${btnStyles}">${DOMPurify.sanitize(d.btnText || 'View')}</a>
                        </td>
                    </tr>
                </table>
            `;
            
            detailsHtml += renderField({ text: DOMPurify.sanitize(d.disclaimerText), fontSize: d.disclaimerFontSize, color: d.disclaimerColor, bgColor: d.disclaimerBgColor, fontWeight: 'normal', textAlign: d.disclaimerTextAlign, paddingTop: d.disclaimerPaddingTop, paddingBottom: d.disclaimerPaddingBottom });
            
            return detailsHtml;
        };

        const renderImage = (fixedWidth?: number) => {
            const imgStyles = `display: block; width: 100%; max-width: ${fixedWidth ? `${fixedWidth}px` : '100%'}; height: auto; border: 0;`;
            let imgTag = `<img src="${DOMPurify.sanitize(d.imageSrc || '')}" alt="${DOMPurify.sanitize(d.imageAlt || 'Sales Offer')}" ${fixedWidth ? `width="${fixedWidth}"` : ''} style="${imgStyles}" border="0" />`;
            if (d.imageLink) imgTag = `<a href="${DOMPurify.sanitize(d.imageLink)}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
            return imgTag;
        };

        let offerContentHtml = '';

        if (!imageEnabled) {
            offerContentHtml = `
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr><td align="center">${renderDetails()}</td></tr>
                </table>
            `;
        } else if (layout === 'center') {
            offerContentHtml = `
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr><td align="center" style="padding-bottom: 20px;">${renderImage()}</td></tr>
                    <tr><td align="center">${renderDetails()}</td></tr>
                </table>
            `;
        } else {
            const isRightLayout = layout === 'right';
            const imgColWidth = 240;
            const gutter = 20;

            const imageTd = `
                <td width="${imgColWidth}" class="mobile-stack mobile-padding-bottom" valign="top" style="width: ${imgColWidth}px; vertical-align: top;">
                    ${renderImage(imgColWidth)}
                </td>`;
            const contentTdLeft = `
                <td class="mobile-stack" valign="top" style="vertical-align: top; padding-left: ${gutter}px;">
                    ${renderDetails()}
                </td>`;
            const contentTdRight = `
                <td class="mobile-stack" valign="top" style="vertical-align: top; padding-right: ${gutter}px;">
                    ${renderDetails()}
                </td>`;
                
            offerContentHtml = `
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        ${isRightLayout ? contentTdRight + imageTd : imageTd + contentTdLeft}
                    </tr>
                </table>
            `;
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src 'none'">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <!--[if mso]>
    <style>
        * {
            font-family: Arial, sans-serif !important;
        }
    </style>
    <![endif]-->
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f5f5f7; }
        
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: auto !important; }
            .mobile-stack { display: block !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
            .mobile-padding-bottom { padding-bottom: 24px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f5f5f7;">
    <center style="width: 100%; background-color: #f5f5f7;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;" class="email-container">
            ${sectionsHtml || '<tr><td style="padding: 40px; text-align: center; font-family: sans-serif;">No content added yet.</td></tr>'}
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
    </center>
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
            showToast('Button style updated', 'success');
        });
    });
};

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

    // Path for Header Component
    if (comp.type === 'header') {
        const d = comp.data;
        dynamicStylingContainer.innerHTML = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">${activeField.fieldLabel}</strong></p>
                
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size (px)</label>
                        <input type="number" class="form-control style-control" data-style-key="fontSize" value="${d.fontSize || 24}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alignment</label>
                        <select class="form-control style-control" data-style-key="textAlign">
                            <option value="left" ${d.textAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${d.textAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${d.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Text Color</label>
                        <input type="color" class="form-control style-control" data-style-key="textColor" value="${(d.textColor && d.textColor.startsWith('#')) ? d.textColor : '#1d1d1f'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Background Color</label>
                        <input type="color" class="form-control style-control" data-style-key="backgroundColor" value="${d.backgroundColor === 'transparent' ? '#ffffff' : d.backgroundColor || '#ffffff'}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Formatting</label>
                    <div class="toggle-group">
                        <button type="button" class="toggle-btn format-toggle style-control ${d.fontWeight === 'bold' ? 'active' : ''}" data-style-key="fontWeight" data-val-on="bold" data-val-off="normal">B</button>
                        <button type="button" class="toggle-btn format-toggle style-control ${d.fontStyle === 'italic' ? 'active' : ''}" data-style-key="fontStyle" data-val-on="italic" data-val-off="normal">I</button>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding T</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingTop" value="${d.paddingTop || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding B</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingBottom" value="${d.paddingBottom || 0}">
                    </div>
                     <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingLeftRight" value="${d.paddingLeftRight || 0}">
                    </div>
                </div>
            </div>
        `;

        dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
            const key = inputEl.dataset.styleKey;
            if (!key) return;

            if (inputEl.classList.contains('format-toggle')) {
                inputEl.addEventListener('click', () => {
                    const onVal = inputEl.dataset.valOn as string;
                    const offVal = inputEl.dataset.valOff as string;
                    const currentVal = comp.data[key];
                    const newVal = currentVal === onVal ? offVal : onVal;
                    updateComponentData(comp.id, key, newVal);
                    inputEl.classList.toggle('active');
                });
            } else {
                inputEl.addEventListener('input', () => {
                    updateComponentData(comp.id, key, inputEl.value);
                });
            }
        });
        return;
    } else if (comp.type === 'text_block') {
        const d = comp.data;
        dynamicStylingContainer.innerHTML = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">${activeField.fieldLabel}</strong></p>
                
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size (px)</label>
                        <input type="number" class="form-control style-control" data-style-key="fontSize" value="${d.fontSize || 16}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alignment</label>
                        <select class="form-control style-control" data-style-key="textAlign">
                            <option value="left" ${d.textAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${d.textAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${d.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Text Color</label>
                        <input type="color" class="form-control style-control" data-style-key="textColor" value="${(d.textColor && d.textColor.startsWith('#')) ? d.textColor : '#3c3c43'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Background Color</label>
                        <input type="color" class="form-control style-control" data-style-key="backgroundColor" value="${d.backgroundColor === 'transparent' ? '#ffffff' : d.backgroundColor || '#ffffff'}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Formatting</label>
                    <div class="toggle-group">
                        <button type="button" class="toggle-btn format-toggle style-control ${d.fontWeight === 'bold' ? 'active' : ''}" data-style-key="fontWeight" data-val-on="bold" data-val-off="normal">B</button>
                        <button type="button" class="toggle-btn format-toggle style-control ${d.fontStyle === 'italic' ? 'active' : ''}" data-style-key="fontStyle" data-val-on="italic" data-val-off="normal">I</button>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding T</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingTop" value="${d.paddingTop || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding B</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingBottom" value="${d.paddingBottom || 0}">
                    </div>
                     <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingLeftRight" value="${d.paddingLeftRight || 0}">
                    </div>
                </div>
            </div>
        `;

        dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
            const key = inputEl.dataset.styleKey;
            if (!key) return;

            if (inputEl.classList.contains('format-toggle')) {
                inputEl.addEventListener('click', () => {
                    const onVal = inputEl.dataset.valOn as string;
                    const offVal = inputEl.dataset.valOff as string;
                    const currentVal = comp.data[key];
                    const newVal = currentVal === onVal ? offVal : onVal;
                    updateComponentData(comp.id, key, newVal);
                    inputEl.classList.toggle('active');
                });
            } else {
                inputEl.addEventListener('input', () => {
                    updateComponentData(comp.id, key, inputEl.value);
                });
            }
        });
        return;
    } else if (comp.type === 'image') {
        const d = comp.data;
        dynamicStylingContainer.innerHTML = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">Image</strong></p>

                <div class="form-group">
                    <label class="form-label">Width (%)</label>
                    <input type="number" class="form-control style-control" data-style-key="width" value="${parseInt(d.width || '100', 10)}">
                </div>

                <div class="form-group">
                    <label class="form-label">Alignment</label>
                    <select class="form-control style-control" data-style-key="align">
                        <option value="left" ${d.align === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${d.align === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${d.align === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>

                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding T</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingTop" value="${d.paddingTop || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding B</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingBottom" value="${d.paddingBottom || 0}">
                    </div>
                     <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingLeftRight" value="${d.paddingLeftRight || 0}">
                    </div>
                </div>
            </div>
        `;

        dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement;
            const key = inputEl.dataset.styleKey;
            if (!key) return;
            
            inputEl.addEventListener('input', () => {
                let value = inputEl.value;
                if (key === 'width') {
                    value = `${value}%`;
                }
                updateComponentData(comp.id, key, value);
            });
        });
        return;
    } else if (comp.type === 'divider') {
        const d = comp.data;
        dynamicStylingContainer.innerHTML = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">Divider</strong></p>
                
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Width (%)</label>
                        <input type="number" class="form-control style-control" data-style-key="width" value="${d.width || '100'}" min="1" max="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Thickness (px)</label>
                        <input type="number" class="form-control style-control" data-style-key="thickness" value="${d.thickness || '2'}" min="1" max="20">
                    </div>
                </div>

                <div class="grid grid-cols-2">
                     <div class="form-group">
                        <label class="form-label">Line Color</label>
                        <input type="color" class="form-control style-control" data-style-key="lineColor" value="${d.lineColor || '#CCCCCC'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alignment</label>
                        <select class="form-control style-control" data-style-key="alignment">
                            <option value="left" ${d.alignment === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${d.alignment === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${d.alignment === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                </div>

                 <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Padding Top</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingTop" value="${d.paddingTop || '16'}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding Bottom</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingBottom" value="${d.paddingBottom || '16'}" min="0" max="100">
                    </div>
                </div>
            </div>
        `;
        dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement;
            const key = inputEl.dataset.styleKey;
            if (!key) return;

            inputEl.addEventListener('input', () => {
                const value = inputEl.value;
                updateComponentData(comp.id, key, value);

                // Update preview in real-time
                const previewContainer = document.querySelector(`[data-id='${comp.id}'] .divider-preview-container`);
                const previewLine = document.querySelector(`[data-id='${comp.id}'] .divider-preview-line`) as HTMLElement;

                if (previewContainer && previewLine) {
                    switch(key) {
                        case 'width':
                            previewLine.style.width = `${value}%`;
                            break;
                        case 'thickness':
                            previewLine.style.height = `${value}px`;
                            break;
                        case 'lineColor':
                            previewLine.style.backgroundColor = value;
                            break;
                        case 'alignment':
                            previewContainer.setAttribute('data-alignment', value);
                            break;
                        case 'paddingTop':
                            (previewContainer as HTMLElement).style.paddingTop = `${value}px`;
                            break;
                        case 'paddingBottom':
                            (previewContainer as HTMLElement).style.paddingBottom = `${value}px`;
                            break;
                    }
                }
            });
        });

        return;
    } else if (comp.type === 'spacer') {
        const d = comp.data;
        const matchBg = d.matchEmailBackground === 'true';
        dynamicStylingContainer.innerHTML = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">Spacer</strong></p>

                <div class="form-group">
                    <label class="form-label">Height (px)</label>
                    <input type="number" class="form-control style-control" data-style-key="height" value="${d.height || '40'}" min="0" max="200">
                </div>

                <div class="form-group">
                    <label class="form-label">Background Color</label>
                    <input type="color" class="form-control style-control" data-style-key="backgroundColor" value="${d.backgroundColor || '#ffffff'}" ${matchBg ? 'disabled' : ''}>
                </div>
                
                <div class="form-group" style="display: flex; align-items: center; gap: var(--spacing-sm);">
                    <input type="checkbox" id="match-bg-checkbox" class="style-control" data-style-key="matchEmailBackground" ${matchBg ? 'checked' : ''} style="width: auto; height: auto;">
                    <label for="match-bg-checkbox" class="form-label" style="margin-bottom: 0;">Match Email Background</label>
                </div>
            </div>
        `;
        
        const heightInput = dynamicStylingContainer.querySelector('[data-style-key="height"]') as HTMLInputElement;
        const bgColorInput = dynamicStylingContainer.querySelector('[data-style-key="backgroundColor"]') as HTMLInputElement;
        const matchBgCheckbox = dynamicStylingContainer.querySelector('[data-style-key="matchEmailBackground"]') as HTMLInputElement;

        const updateSpacerPreview = () => {
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
            
            if (!isMatch && newBgColor !== 'transparent') {
                preview.classList.add('has-bg-color');
            } else {
                preview.classList.remove('has-bg-color');
            }
        };

        heightInput.addEventListener('input', () => {
            updateComponentData(comp.id, 'height', heightInput.value);
            updateSpacerPreview();
        });
        bgColorInput.addEventListener('input', () => {
            updateComponentData(comp.id, 'backgroundColor', bgColorInput.value);
            updateSpacerPreview();
        });
        matchBgCheckbox.addEventListener('change', () => {
            const isChecked = matchBgCheckbox.checked;
            bgColorInput.disabled = isChecked;
            updateComponentData(comp.id, 'matchEmailBackground', isChecked.toString());
            updateSpacerPreview();
        });

        return;
    } else if (comp.type === 'service_offer') {
        const d = comp.data;
        let content = '';

        const header = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">${activeField.fieldLabel}</strong></p>
        `;
        const footer = `</div>`;

        switch(activeField.fieldKey) {
            case 'serviceOfferContainer':
                content = `
                    <div style="padding: 10px; text-align: center; color: var(--label-secondary); font-size: 13px;">
                        <p>Select a specific field like the <strong>Title</strong> or <strong>Button</strong> to view its styling options.</p>
                    </div>
                `;
                break;
            case 'serviceOfferImage':
                 content = `
                    <div class="form-group"><label class="form-label">Width (%)</label><input type="number" class="form-control style-control" data-style-key="imageWidth" value="${d.imageWidth}"></div>
                    <div class="form-group"><label class="form-label">Alignment</label><select class="form-control style-control" data-style-key="imageAlignment"><option value="left" ${d.imageAlignment === 'left' ? 'selected' : ''}>Left</option><option value="center" ${d.imageAlignment === 'center' ? 'selected' : ''}>Center</option><option value="right" ${d.imageAlignment === 'right' ? 'selected' : ''}>Right</option></select></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Padding Top</label><input type="number" class="form-control style-control" data-style-key="imagePaddingTop" value="${d.imagePaddingTop}"></div><div class="form-group"><label class="form-label">Padding Bottom</label><input type="number" class="form-control style-control" data-style-key="imagePaddingBottom" value="${d.imagePaddingBottom}"></div></div>
                 `;
                break;
            case 'serviceOfferTitle':
                content = `
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Font Size</label><input type="number" class="form-control style-control" data-style-key="titleFontSize" value="${d.titleFontSize}"></div><div class="form-group"><label class="form-label">Font Weight</label><select class="form-control style-control" data-style-key="titleFontWeight"><option value="normal" ${d.titleFontWeight === 'normal' ? 'selected' : ''}>Normal</option><option value="bold" ${d.titleFontWeight === 'bold' ? 'selected' : ''}>Bold</option></select></div></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Text Color</label><input type="color" class="form-control style-control" data-style-key="titleTextColor" value="${d.titleTextColor}"></div><div class="form-group"><label class="form-label">BG Color</label><input type="color" class="form-control style-control" data-style-key="titleBgColor" value="${d.titleBgColor}"></div></div>
                    <div class="form-group"><label class="form-label">Alignment</label><select class="form-control style-control" data-style-key="titleAlignment"><option value="left" ${d.titleAlignment === 'left' ? 'selected' : ''}>Left</option><option value="center" ${d.titleAlignment === 'center' ? 'selected' : ''}>Center</option><option value="right" ${d.titleAlignment === 'right' ? 'selected' : ''}>Right</option></select></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Padding Top</label><input type="number" class="form-control style-control" data-style-key="titlePaddingTop" value="${d.titlePaddingTop}"></div><div class="form-group"><label class="form-label">Padding Bottom</label><input type="number" class="form-control style-control" data-style-key="titlePaddingBottom" value="${d.titlePaddingBottom}"></div></div>
                `;
                break;
            case 'serviceOfferCoupon':
                const couponShowBorder = d.couponShowBorder === 'true';
                content = `
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Font Size</label><input type="number" class="form-control style-control" data-style-key="couponFontSize" value="${d.couponFontSize}"></div><div class="form-group"><label class="form-label">Font Weight</label><select class="form-control style-control" data-style-key="couponFontWeight"><option value="normal" ${d.couponFontWeight === 'normal' ? 'selected' : ''}>Normal</option><option value="bold" ${d.couponFontWeight === 'bold' ? 'selected' : ''}>Bold</option></select></div></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Text Color</label><input type="color" class="form-control style-control" data-style-key="couponTextColor" value="${d.couponTextColor}"></div><div class="form-group"><label class="form-label">BG Color</label><input type="color" class="form-control style-control" data-style-key="couponBgColor" value="${d.couponBgColor}"></div></div>
                    <div class="form-group"><label class="form-label">Alignment</label><select class="form-control style-control" data-style-key="couponAlignment"><option value="left" ${d.couponAlignment === 'left' ? 'selected' : ''}>Left</option><option value="center" ${d.couponAlignment === 'center' ? 'selected' : ''}>Center</option><option value="right" ${d.couponAlignment === 'right' ? 'selected' : ''}>Right</option></select></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Padding T/B</label><input type="number" class="form-control style-control" data-style-key="couponPaddingTop" value="${d.couponPaddingTop}"><input type="number" class="form-control style-control mt-2" data-style-key="couponPaddingBottom" value="${d.couponPaddingBottom}"></div><div class="form-group"><label class="form-label">Padding L/R</label><input type="number" class="form-control style-control" data-style-key="couponPaddingLeft" value="${d.couponPaddingLeft}"><input type="number" class="form-control style-control mt-2" data-style-key="couponPaddingRight" value="${d.couponPaddingRight}"></div></div>
                    <div class="form-group"><label class="form-label"><input type="checkbox" class="style-control" data-style-key="couponShowBorder" ${couponShowBorder ? 'checked' : ''}> Show Coupon Border</label></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Border Style</label><select class="form-control style-control" data-style-key="couponBorderStyle" ${!couponShowBorder ? 'disabled' : ''}><option value="solid" ${d.couponBorderStyle === 'solid' ? 'selected': ''}>Solid</option><option value="dashed" ${d.couponBorderStyle === 'dashed' ? 'selected': ''}>Dashed</option><option value="dotted" ${d.couponBorderStyle === 'dotted' ? 'selected': ''}>Dotted</option></select></div><div class="form-group"><label class="form-label">Border Color</label><input type="color" class="form-control style-control" data-style-key="couponBorderColor" value="${d.couponBorderColor}" ${!couponShowBorder ? 'disabled' : ''}></div></div>
                `;
                break;
            case 'serviceOfferDetails':
                content = `
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Font Size</label><input type="number" class="form-control style-control" data-style-key="detailsFontSize" value="${d.detailsFontSize}"></div><div class="form-group"><label class="form-label">Line Height</label><input type="number" step="0.1" class="form-control style-control" data-style-key="detailsLineHeight" value="${d.detailsLineHeight}"></div></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Text Color</label><input type="color" class="form-control style-control" data-style-key="detailsTextColor" value="${d.detailsTextColor}"></div><div class="form-group"><label class="form-label">BG Color</label><input type="color" class="form-control style-control" data-style-key="detailsBgColor" value="${d.detailsBgColor}"></div></div>
                    <div class="form-group"><label class="form-label">Alignment</label><select class="form-control style-control" data-style-key="detailsAlignment"><option value="left" ${d.detailsAlignment === 'left' ? 'selected' : ''}>Left</option><option value="center" ${d.detailsAlignment === 'center' ? 'selected' : ''}>Center</option><option value="right" ${d.detailsAlignment === 'right' ? 'selected' : ''}>Right</option></select></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Padding Top</label><input type="number" class="form-control style-control" data-style-key="detailsPaddingTop" value="${d.detailsPaddingTop}"></div><div class="form-group"><label class="form-label">Padding Bottom</label><input type="number" class="form-control style-control" data-style-key="detailsPaddingBottom" value="${d.detailsPaddingBottom}"></div></div>
                `;
                break;
            case 'serviceOfferDisclaimer':
                content = `
                    <div class="form-group"><label class="form-label">Font Size</label><input type="number" class="form-control style-control" data-style-key="disclaimerFontSize" value="${d.disclaimerFontSize}"></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Text Color</label><input type="color" class="form-control style-control" data-style-key="disclaimerTextColor" value="${d.disclaimerTextColor}"></div><div class="form-group"><label class="form-label">BG Color</label><input type="color" class="form-control style-control" data-style-key="disclaimerBgColor" value="${d.disclaimerBgColor}"></div></div>
                    <div class="form-group"><label class="form-label">Alignment</label><select class="form-control style-control" data-style-key="disclaimerAlignment"><option value="left" ${d.disclaimerAlignment === 'left' ? 'selected' : ''}>Left</option><option value="center" ${d.disclaimerAlignment === 'center' ? 'selected' : ''}>Center</option><option value="right" ${d.disclaimerAlignment === 'right' ? 'selected' : ''}>Right</option></select></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Padding Top</label><input type="number" class="form-control style-control" data-style-key="disclaimerPaddingTop" value="${d.disclaimerPaddingTop}"></div><div class="form-group"><label class="form-label">Padding Bottom</label><input type="number" class="form-control style-control" data-style-key="disclaimerPaddingBottom" value="${d.disclaimerPaddingBottom}"></div></div>
                `;
                break;
            case 'serviceOfferButton':
                content = `
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Font Size</label><input type="number" class="form-control style-control" data-style-key="buttonFontSize" value="${d.buttonFontSize}"></div><div class="form-group"><label class="form-label">Alignment</label><select class="form-control style-control" data-style-key="buttonAlignment"><option value="left" ${d.buttonAlignment === 'left' ? 'selected' : ''}>Left</option><option value="center" ${d.buttonAlignment === 'center' ? 'selected' : ''}>Center</option><option value="right" ${d.buttonAlignment === 'right' ? 'selected' : ''}>Right</option></select></div></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Button Color</label><input type="color" class="form-control style-control" data-style-key="buttonBgColor" value="${d.buttonBgColor}"></div><div class="form-group"><label class="form-label">Text Color</label><input type="color" class="form-control style-control" data-style-key="buttonTextColor" value="${d.buttonTextColor}"></div></div>
                    <div class="grid grid-cols-2"><div class="form-group"><label class="form-label">Padding T</label><input type="number" class="form-control style-control" data-style-key="buttonPaddingTop" value="${d.buttonPaddingTop}"></div><div class="form-group"><label class="form-label">Padding B</label><input type="number" class="form-control style-control" data-style-key="buttonPaddingBottom" value="${d.buttonPaddingBottom}"></div></div>
                    <div class="form-group">
                        <label class="form-label">Button Width</label>
                        <select class="form-control style-control" data-style-key="buttonWidth">
                            <option value="auto" ${d.buttonWidth === 'auto' ? 'selected' : ''}>Auto-Sized</option>
                            <option value="100%" ${d.buttonWidth === '100%' ? 'selected' : ''}>Full Width (100%)</option>
                            <option value="160px" ${d.buttonWidth === '160px' ? 'selected' : ''}>Fixed: Small (160px)</option>
                            <option value="280px" ${d.buttonWidth === '280px' ? 'selected' : ''}>Fixed: Medium (280px)</option>
                            <option value="400px" ${d.buttonWidth === '400px' ? 'selected' : ''}>Fixed: Large (400px)</option>
                        </select>
                    </div>
                `;
                break;
            default:
                content = `
                    <div style="padding: 10px; text-align: center; color: var(--label-secondary); font-size: 13px;">
                        <p>Select a specific field like the <strong>Title</strong> or <strong>Button</strong> to view its styling options.</p>
                    </div>
                `;
        }
        
        let finalHtml = header + content + footer;

        if (activeField.fieldKey === 'serviceOfferButton') {
            finalHtml += getButtonStyleSectionHtml();
        }

        dynamicStylingContainer.innerHTML = finalHtml;

        dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement;
            const key = inputEl.dataset.styleKey;
            if (!key) return;
            const eventType = inputEl.type === 'checkbox' ? 'change' : 'input';
            
            inputEl.addEventListener(eventType, () => {
                const value = inputEl.type === 'checkbox' ? (inputEl as HTMLInputElement).checked.toString() : inputEl.value;
                updateComponentData(comp.id, key, value);

                if (key === 'couponShowBorder') {
                    renderStylingPanel();
                }
            });
        });

        if (activeField.fieldKey === 'serviceOfferButton') {
            attachButtonStyleListeners();
        }
        return;

    } else if (
        (comp.type === 'button' && activeField.fieldKey === 'button') ||
        (comp.type === 'sales_offer' && activeField.fieldKey === 'salesOfferButton')
    ) {
        const isSalesOffer = comp.type === 'sales_offer';
        const p = isSalesOffer ? 'btn' : ''; // prefix
        const d = comp.data;

        const get = (key: string, def: string) => d[p ? `${p}${key.charAt(0).toUpperCase() + key.slice(1)}` : key] || def;
        
        const fontSize = get('fontSize', '16');
        const align = get('align', 'center');
        const bgColor = d[isSalesOffer ? 'btnColor' : 'backgroundColor'] || '#007aff';
        const textColor = get('textColor', '#ffffff');
        const paddingTop = get('paddingTop', '12');
        const paddingBottom = get('paddingBottom', '12');
        const widthType = get('widthType', 'auto');
        
        let finalHtml = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">${activeField.fieldLabel}</strong></p>
                
                 <div class="form-group">
                    <label class="form-label">Font Size (px)</label>
                    <input type="number" class="form-control style-control" data-style-key="fontSize" value="${fontSize}">
                </div>
                <div class="form-group">
                    <label class="form-label">Alignment</label>
                    <select class="form-control style-control" data-style-key="align">
                        <option value="left" ${align === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${align === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${align === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Button Color</label>
                        <input type="color" class="form-control style-control" data-style-key="backgroundColor" value="${bgColor}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Text Color</label>
                        <input type="color" class="form-control style-control" data-style-key="textColor" value="${textColor}">
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Padding Top</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingTop" value="${paddingTop}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding Bottom</label>
                        <input type="number" class="form-control style-control" data-style-key="paddingBottom" value="${paddingBottom}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Button Width</label>
                    <select class="form-control style-control" data-style-key="widthType">
                        <option value="full" ${widthType === 'full' ? 'selected' : ''}>Full Width (100%)</option>
                        <option value="auto" ${widthType === 'auto' ? 'selected' : ''}>Auto-Sized</option>
                        <option value="small" ${widthType === 'small' ? 'selected' : ''}>Fixed: Small (160px)</option>
                        <option value="medium" ${widthType === 'medium' ? 'selected' : ''}>Fixed: Medium (280px)</option>
                        <option value="large" ${widthType === 'large' ? 'selected' : ''}>Fixed: Large (400px)</option>
                    </select>
                </div>
            </div>
        `;

        finalHtml += getButtonStyleSectionHtml();
        dynamicStylingContainer.innerHTML = finalHtml;
        
        dynamicStylingContainer.querySelectorAll('.style-control').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement;
            let key = inputEl.dataset.styleKey;
            if (!key) return;

            let finalKey = p ? `${p}${key.charAt(0).toUpperCase() + key.slice(1)}` : key;
            if(isSalesOffer && key === 'backgroundColor') finalKey = 'btnColor';
            
            inputEl.addEventListener('input', () => {
                updateComponentData(comp.id, finalKey, inputEl.value);
            });
        });

        attachButtonStyleListeners();
        return;
    }

    // Path for Sales Offer Fields
    if (comp.type === 'sales_offer') {
        let dataObject = comp.data;
        if (activeField.subOfferIndex !== undefined) {
            const offers = JSON.parse(comp.data.additionalOffers || '[]');
            dataObject = offers[activeField.subOfferIndex] || {};
        }

        const fieldKey = activeField.fieldKey;
        
        const fontSize = dataObject[`${fieldKey}FontSize`] || '14';
        const textAlign = dataObject[`${fieldKey}TextAlign`] || 'center';
        const textColor = dataObject[`${fieldKey}Color`] || '#000000';
        const bgColor = dataObject[`${fieldKey}BgColor`] || 'transparent';
        const paddingTop = dataObject[`${fieldKey}PaddingTop`] || '0';
        const paddingBottom = dataObject[`${fieldKey}PaddingBottom`] || '0';

        dynamicStylingContainer.innerHTML = `
            <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-lg); margin-top: var(--spacing-lg);">
                <h4>Field Styling</h4>
                <p class="text-sm" style="color: var(--label-secondary); margin-bottom: var(--spacing-md);">Currently editing: <strong style="color: var(--label-primary);">${activeField.fieldLabel}</strong></p>
                
                <div class="form-group">
                    <label class="form-label">Font Size (px)</label>
                    <input type="number" class="form-control" data-style-key="FontSize" value="${fontSize}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Alignment</label>
                    <select class="form-control" data-style-key="TextAlign">
                        <option value="left" ${textAlign === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${textAlign === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${textAlign === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
                
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Text Color</label>
                        <input type="color" class="form-control" data-style-key="Color" value="${textColor}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Background Color</label>
                        <input type="color" class="form-control" data-style-key="BgColor" value="${bgColor === 'transparent' ? '#ffffff' : bgColor}">
                    </div>
                </div>
                
                 <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Padding Top</label>
                        <input type="number" class="form-control" data-style-key="PaddingTop" value="${paddingTop}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding Bottom</label>
                        <input type="number" class="form-control" data-style-key="PaddingBottom" value="${paddingBottom}">
                    </div>
                </div>
            </div>
        `;

        dynamicStylingContainer.querySelectorAll('input, select').forEach(el => {
            const inputEl = el as HTMLInputElement | HTMLSelectElement;
            const styleKey = inputEl.dataset.styleKey;
            if (!styleKey) return;
            
            const fullKey = `${fieldKey}${styleKey}`;

            inputEl.addEventListener('input', () => {
                 if (activeField.subOfferIndex !== undefined) {
                    updateSubOfferData(activeField.componentId, activeField.subOfferIndex, fullKey, inputEl.value);
                } else {
                    updateComponentData(activeField.componentId, fullKey, inputEl.value);
                }
            });
        });
        return;
    }
    
    // Clear panel if no specific handler
    dynamicStylingContainer.innerHTML = '';
};


saveTemplateBtn?.addEventListener('click', saveTemplate);
loadCollapsedStates();
renderMergeFieldsSidebar();
loadDraft();
renderComponents();
renderSavedTemplates();
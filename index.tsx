/**
 * @license
 * Copyright Wallace, Jayden
 * SPDX-License-Identifier: Apache-2.0
 */

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
      { label: "Email", value: "{{recipient.email}}" },
      { label: "Phone", value: "{{recipient.phone}}" },
      { label: "Address", value: "{{recipient.address}}" },
      { label: "City", value: "{{recipient.city}}" },
      { label: "State", value: "{{recipient.state}}" },
      { label: "Zip", value: "{{recipient.zip}}" }
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
      { label: "Mileage", value: "{{customer.last_transaction.vehicle.mileage}}" },
      { label: "Color", value: "{{customer.last_transaction.vehicle.color}}" },
      { label: "Stock Number", value: "{{customer.last_transaction.vehicle.stock_number}}" }
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
      { label: "Website URL", value: "{{dealership.website_url}}" },
      { label: "Sales Rep Name", value: "{{dealership.sales.representative.name}}" },
      { label: "Sales Rep Title", value: "{{dealership.sales.representative.title}}" },
      { label: "Sales Rep Email", value: "{{dealership.sales.representative.email}}" }
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
const componentPickerOverlay = document.getElementById('component-picker-overlay');
const closeComponentPicker = document.getElementById('close-component-picker');

// Toggle buttons
const designToggle = document.getElementById('floating-design-btn');
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
const buttonStyleOptions = document.querySelectorAll('.button-style-option');

// Saved Template Elements
const saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
const savedTemplatesList = document.getElementById('saved-templates-list') as HTMLElement;

// Toast Notification
const toastContainer = document.getElementById('toast-container');
const toastMessage = document.getElementById('toast-message');

const showToast = (message: string) => {
    if(toastMessage && toastContainer) {
        toastMessage.textContent = message;
        toastContainer.classList.add('visible');
        setTimeout(() => {
            toastContainer.classList.remove('visible');
        }, 3000);
    }
}

// Local Storage Keys
const LS_TEMPLATES_KEY = 'craftor_saved_templates';
const LS_DRAFT_KEY = 'craftor_current_draft';

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
    showToast('Font updated');
});

buttonStyleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        buttonStyleOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        designSettings.buttonStyle = opt.getAttribute('data-button') || 'rounded';
        saveDraft();
        showToast('Button style updated');
    });
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
        showToast(`Inserted: ${value}`);
    } else {
        showToast('Please click a text field first to insert the merge field.');
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

const closeSidebarFunc = () => {
  designSidebar?.classList.remove('open');
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

closeDesignSidebar?.addEventListener('click', closeSidebarFunc);
closeMergeSidebar?.addEventListener('click', closeSidebarFunc);
sidebarOverlay?.addEventListener('click', closeSidebarFunc);

designToggle?.addEventListener('click', () => {
  designSidebar?.classList.add('open');
  sidebarOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
});

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
            paddingTop: '20',
            paddingBottom: '20',
            paddingLeftRight: '20',
            widthType: 'full'
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

            stockVinText: 'VIN: {{customer.last_transaction.vehicle.vin}}',
            stockVinFontSize: '11',
            stockVinColor: '#86868b',
            stockVinBgColor: 'transparent',
            stockVinTextAlign: 'center',
            stockVinPaddingTop: '10', stockVinPaddingBottom: '0',

            mileageText: 'Mileage: {{customer.last_transaction.vehicle.mileage}}',
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
    showToast(`${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)} added`);
};

const removeComponent = (id: string) => {
    activeComponents = activeComponents.filter(c => c.id !== id);
    renderComponents();
    saveDraft();
    showToast('Section removed');
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
        
        let componentFormHtml = '';
        if (comp.type === 'header' || comp.type === 'text_block') {
            const isHeader = comp.type === 'header';
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">${isHeader ? 'Header' : 'Text'} Content</label>
                    <textarea class="form-control" data-key="text">${comp.data.text || ''}</textarea>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size (px)</label>
                        <input type="number" class="form-control" data-key="fontSize" value="${comp.data.fontSize || 16}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alignment</label>
                        <select class="form-control" data-key="textAlign">
                            <option value="left" ${comp.data.textAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${comp.data.textAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${comp.data.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Text Color</label>
                        <div class="color-input-container">
                            <input type="color" class="color-input-hidden" data-key="textColor" value="${(comp.data.textColor && comp.data.textColor.startsWith('#')) ? comp.data.textColor : '#1d1d1f'}">
                            <div class="color-swatch-display" style="background: ${comp.data.textColor || '#1d1d1f'}"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Background Color</label>
                        <div class="color-input-container">
                            <input type="color" class="color-input-hidden" data-key="backgroundColor" value="${comp.data.backgroundColor === 'transparent' ? '#ffffff' : comp.data.backgroundColor || '#ffffff'}">
                            <div class="color-swatch-display" style="background: ${comp.data.backgroundColor === 'transparent' ? '#ffffff' : comp.data.backgroundColor || '#ffffff'}"></div>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Formatting</label>
                    <div class="toggle-group">
                        <button type="button" class="toggle-btn format-toggle ${comp.data.fontWeight === 'bold' ? 'active' : ''}" data-key="fontWeight" data-val-on="bold" data-val-off="normal">B</button>
                        <button type="button" class="toggle-btn format-toggle ${comp.data.fontStyle === 'italic' ? 'active' : ''}" data-key="fontStyle" data-val-on="italic" data-val-off="normal">I</button>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding T</label>
                        <input type="number" class="form-control" data-key="paddingTop" value="${comp.data.paddingTop || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding B</label>
                        <input type="number" class="form-control" data-key="paddingBottom" value="${comp.data.paddingBottom || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control" data-key="paddingLeftRight" value="${comp.data.paddingLeftRight || 0}">
                    </div>
                </div>
            `;
        } else if (comp.type === 'image') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Image Source (URL)</label>
                    <input type="text" class="form-control" data-key="src" value="${comp.data.src || ''}">
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Alt Text</label>
                        <input type="text" class="form-control" data-key="alt" value="${comp.data.alt || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Link URL</label>
                        <input type="text" class="form-control" data-key="link" value="${comp.data.link || ''}">
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Width (%)</label>
                        <input type="text" class="form-control" data-key="width" value="${comp.data.width || '100%'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alignment</label>
                        <select class="form-control" data-key="align">
                            <option value="left" ${comp.data.align === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${comp.data.align === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${comp.data.align === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding T</label>
                        <input type="number" class="form-control" data-key="paddingTop" value="${comp.data.paddingTop || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding B</label>
                        <input type="number" class="form-control" data-key="paddingBottom" value="${comp.data.paddingBottom || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control" data-key="paddingLeftRight" value="${comp.data.paddingLeftRight || 0}">
                    </div>
                </div>
            `;
        } else if (comp.type === 'button') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Button Text</label>
                    <input type="text" class="form-control" data-key="text" value="${comp.data.text || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Button Link</label>
                    <input type="text" class="form-control" data-key="link" value="${comp.data.link || ''}">
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size</label>
                        <input type="number" class="form-control" data-key="fontSize" value="${comp.data.fontSize || 16}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Button Width Setting</label>
                        <select class="form-control" data-key="widthType">
                            <option value="full" ${comp.data.widthType === 'full' ? 'selected' : ''}>Full Width (100%)</option>
                            <option value="auto" ${comp.data.widthType === 'auto' ? 'selected' : ''}>Auto-Sized</option>
                            <option value="small" ${comp.data.widthType === 'small' ? 'selected' : ''}>Fixed: Small (160px)</option>
                            <option value="medium" ${comp.data.widthType === 'medium' ? 'selected' : ''}>Fixed: Medium (280px)</option>
                            <option value="large" ${comp.data.widthType === 'large' ? 'selected' : ''}>Fixed: Large (400px)</option>
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Text Color</label>
                        <div class="color-input-container">
                            <input type="color" class="color-input-hidden" data-key="textColor" value="${comp.data.textColor || '#ffffff'}">
                            <div class="color-swatch-display" style="background: ${comp.data.textColor || '#ffffff'}"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Button Color</label>
                        <div class="color-input-container">
                            <input type="color" class="color-input-hidden" data-key="backgroundColor" value="${comp.data.backgroundColor || '#007aff'}">
                            <div class="color-swatch-display" style="background: ${comp.data.backgroundColor || '#007aff'}"></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (comp.type === 'sales_offer') {
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

                <div class="compact-separator"><span>Primary Offer</span></div>

                <div class="form-group-inline"><label class="form-label-inline">Vehicle</label><input type="text" class="form-control compact" data-key="vehicleText" data-stylable="true" data-component-id="${comp.id}" data-field-key="vehicle" data-field-label="Vehicle Name" value="${comp.data.vehicleText || ''}"></div>
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
                            <div class="compact-offer-body">
                                <div class="inline-input-group"><label>Sep:</label><input type="text" class="form-control compact sub-offer-field" data-index="${i}" data-field="separator" value="${o.separator || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="separator" data-field-label="Separator" data-sub-offer-index="${i}"></div>
                                <div class="inline-input-group"><label>Title:</label><input type="text" class="form-control compact sub-offer-field" data-index="${i}" data-field="offer" value="${o.offer || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="offer" data-field-label="Title" data-sub-offer-index="${i}"></div>
                                <div class="inline-input-group"><label>Details:</label><input type="text" class="form-control compact sub-offer-field" data-index="${i}" data-field="details" value="${o.details || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="details" data-field-label="Details" data-sub-offer-index="${i}"></div>
                                <div class="inline-input-group"><label>Disclaimer:</label><input type="text" class="form-control compact sub-offer-field" data-index="${i}" data-field="disclaimer" value="${o.disclaimer || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimer" data-field-label="Disclaimer" data-sub-offer-index="${i}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="compact-separator"><span>Vehicle & Legal Details</span></div>
                
                <div class="form-group-inline wrap">
                    <div class="inline-input-group"><label>Stock/VIN:</label><input type="text" class="form-control compact" data-key="stockVinText" data-stylable="true" data-component-id="${comp.id}" data-field-key="stockVin" data-field-label="Stock/VIN" value="${comp.data.stockVinText || ''}"></div>
                    <div class="inline-input-group"><label>Mileage:</label><input type="text" class="form-control compact" data-key="mileageText" data-stylable="true" data-component-id="${comp.id}" data-field-key="mileage" data-field-label="Mileage" value="${comp.data.mileageText || ''}"></div>
                </div>
                <div class="form-group-inline align-start"><label class="form-label-inline">Disclaimer</label><textarea class="form-control compact" style="height: 48px;" data-key="disclaimerText" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimer" data-field-label="Disclaimer">${comp.data.disclaimerText || ''}</textarea></div>
                
                <div class="compact-separator"><span>Button Settings</span></div>

                <div class="form-group-inline wrap">
                    <div class="inline-input-group"><label>Text:</label><input type="text" class="form-control compact" data-key="btnText" value="${comp.data.btnText || ''}"></div>
                    <div class="inline-input-group"><label>Link:</label><input type="text" class="form-control compact" data-key="btnLink" value="${comp.data.btnLink || ''}"></div>
                </div>
                <div class="form-group-inline wrap button-controls-compact">
                    <div class="inline-input-group"><label>Font:</label><input type="number" class="form-control compact" data-key="btnFontSize" value="${comp.data.btnFontSize || 14}"></div>
                    <div class="inline-input-group"><label>Pad T:</label><input type="number" class="form-control compact" data-key="btnPaddingTop" value="${comp.data.btnPaddingTop || 12}"></div>
                    <div class="inline-input-group"><label>Pad B:</label><input type="number" class="form-control compact" data-key="btnPaddingBottom" value="${comp.data.btnPaddingBottom || 12}"></div>
                    <div class="inline-input-group"><label>Width:</label><select class="form-control compact" data-key="btnWidthType"><option value="full" ${comp.data.btnWidthType === 'full' ? 'selected' : ''}>Full</option><option value="auto" ${comp.data.btnWidthType === 'auto' ? 'selected' : ''}>Auto</option><option value="small" ${comp.data.btnWidthType === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${comp.data.btnWidthType === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${comp.data.btnWidthType === 'large' ? 'selected' : ''}>Large</option></select></div>
                    <div class="inline-input-group"><label>Align:</label><select class="form-control compact" data-key="btnAlign"><option value="center" ${(!comp.data.btnAlign || comp.data.btnAlign === 'center') ? 'selected' : ''}>Center</option><option value="left" ${comp.data.btnAlign === 'left' ? 'selected' : ''}>Left</option><option value="right" ${comp.data.btnAlign === 'right' ? 'selected' : ''}>Right</option></select></div>
                    <div class="inline-input-group color-group"><label>Btn:</label><div class="color-input-container mini"><input type="color" class="color-input-hidden" data-key="btnColor" value="${comp.data.btnColor || '#007aff'}"><div class="color-swatch-display" style="background: ${comp.data.btnColor || '#007aff'}"></div></div></div>
                    <div class="inline-input-group color-group"><label>Text:</label><div class="color-input-container mini"><input type="color" class="color-input-hidden" data-key="btnTextColor" value="${comp.data.btnTextColor || '#ffffff'}"><div class="color-swatch-display" style="background: ${comp.data.btnTextColor || '#ffffff'}"></div></div></div>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="card-header">
                <span class="text-xs font-bold uppercase" style="color: var(--label-secondary);">#${index + 1} - ${comp.type.replace('_', ' ')}</span>
                <button type="button" class="btn btn-ghost btn-sm remove-comp-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
            <div class="card-body">
                ${componentFormHtml}
            </div>
        `;

        // Event Listeners for nested fields (Sales Offer)
        if (comp.type === 'sales_offer') {
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
                        showToast('Invalid file type. Use JPG, PNG, GIF, or WEBP.');
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) { // 5MB limit
                        showToast('File is too large. Max size is 5MB.');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onloadstart = () => {
                        uploadBtn.textContent = '...';
                        uploadBtn.disabled = true;
                    };
                    reader.onload = (event) => {
                        const result = event.target?.result as string;
                        updateComponentData(comp.id, 'imageSrc', result);
                        (item.querySelector('input[data-key="imageSrc"]') as HTMLInputElement).value = result;
                        showToast('Image uploaded.');
                        uploadBtn.textContent = 'Upload';
                        uploadBtn.disabled = false;
                    };
                    reader.onerror = () => {
                        showToast('Error reading file.');
                        uploadBtn.textContent = 'Upload';
                        uploadBtn.disabled = false;
                    };
                    reader.readAsDataURL(file);
                }
            });

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
                    disclaimer: 'Disclaimer for additional offer.',
                    disclaimerFontSize: '10',
                    disclaimerColor: '#86868b',
                    disclaimerBgColor: 'transparent',
                    disclaimerTextAlign: 'center',
                    disclaimerPaddingTop: '8', disclaimerPaddingBottom: '0',
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

                        if (key === 'imageEnabled') {
                            const fieldsContainer = item.querySelector(`#image-fields-container-${comp.id}`) as HTMLElement;
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

        item.querySelector('.remove-comp-btn')?.addEventListener('click', () => removeComponent(comp.id));
        componentsContainer.appendChild(item);
    });
};

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
      
      const txt = d.text || '';
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
        let imgTag = `<img src="${d.src || ''}" alt="${d.alt || 'Image'}" style="${imgStyles}" border="0" />`;
        if (d.link) imgTag = `<a href="${d.link}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
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
        
        const btnStyles = [`background-color: ${isOutlined ? '#ffffff' : d.backgroundColor}`, `color: ${isOutlined ? d.backgroundColor : d.textColor}`, `padding: 12px 24px`, `text-decoration: none`, `display: block`, `font-weight: bold`, `border-radius: ${radius}`, `font-size: ${d.fontSize}px`, `font-family: ${designSettings.fontFamily}`, `text-align: center`, isOutlined ? `border: 2px solid ${d.backgroundColor}` : 'border: 0'].join(';');
        
        sectionsHtml += `
            <tr>
                <td align="${d.align || 'center'}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                    <table border="0" cellspacing="0" cellpadding="0" ${tableWidthAttr ? `width="${tableWidthAttr}"` : ""} style="margin: ${d.align === 'center' ? '0 auto' : '0'};">
                        <tr>
                            <td align="center" bgcolor="${isOutlined ? '#ffffff' : d.backgroundColor}" style="border-radius: ${radius};">
                                <a href="${d.link || '#'}" target="_blank" style="${btnStyles}">${d.text || 'Button'}</a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    } else if (comp.type === 'sales_offer') {
        const layout = d.layout || 'center';
        const addOffers = JSON.parse(d.additionalOffers || '[]');
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

            detailsHtml += renderField({ text: d.vehicleText, fontSize: d.vehicleFontSize, color: d.vehicleColor, bgColor: d.vehicleBgColor, fontWeight: 'bold', textAlign: d.vehicleTextAlign, paddingTop: d.vehiclePaddingTop, paddingBottom: d.vehiclePaddingBottom });
            detailsHtml += renderField({ text: d.mainOfferText, fontSize: d.mainOfferFontSize, color: d.mainOfferColor, bgColor: d.mainOfferBgColor, fontWeight: '800', textAlign: d.mainOfferTextAlign, paddingTop: d.mainOfferPaddingTop, paddingBottom: d.mainOfferPaddingBottom });
            detailsHtml += renderField({ text: d.detailsText, fontSize: d.detailsFontSize, color: d.detailsColor, bgColor: d.detailsBgColor, fontWeight: 'normal', textAlign: d.detailsTextAlign, paddingTop: d.detailsPaddingTop, paddingBottom: d.detailsPaddingBottom });
            
            addOffers.forEach((o: any) => {
                detailsHtml += renderField({ text: o.separator, fontSize: o.separatorFontSize, color: o.separatorColor, bgColor: o.separatorBgColor, fontWeight: 'bold', textAlign: o.separatorTextAlign, paddingTop: o.separatorPaddingTop, paddingBottom: o.separatorPaddingBottom });
                detailsHtml += renderField({ text: o.offer, fontSize: o.offerFontSize, color: o.offerColor, bgColor: o.offerBgColor, fontWeight: 'bold', textAlign: o.offerTextAlign, paddingTop: o.offerPaddingTop, paddingBottom: o.offerPaddingBottom });
                detailsHtml += renderField({ text: o.details, fontSize: o.detailsFontSize, color: o.detailsColor, bgColor: o.detailsBgColor, fontWeight: 'normal', textAlign: o.detailsTextAlign, paddingTop: o.detailsPaddingTop, paddingBottom: o.detailsPaddingBottom });
                detailsHtml += renderField({ text: o.disclaimer, fontSize: o.disclaimerFontSize, color: o.disclaimerColor, bgColor: o.disclaimerBgColor, fontWeight: 'normal', textAlign: o.disclaimerTextAlign, paddingTop: o.disclaimerPaddingTop, paddingBottom: o.disclaimerPaddingBottom });
            });
            
            detailsHtml += renderField({ text: d.stockVinText, fontSize: d.stockVinFontSize, color: d.stockVinColor, bgColor: d.stockVinBgColor, fontWeight: 'normal', textAlign: d.stockVinTextAlign, paddingTop: d.stockVinPaddingTop, paddingBottom: d.stockVinPaddingBottom });
            detailsHtml += renderField({ text: d.mileageText, fontSize: d.mileageFontSize, color: d.mileageColor, bgColor: d.mileageBgColor, fontWeight: 'normal', textAlign: d.mileageTextAlign, paddingTop: d.mileagePaddingTop, paddingBottom: d.mileagePaddingBottom });
            
            const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
            
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

            detailsHtml += `
                <table border="0" cellspacing="0" cellpadding="0" ${btnTableWidthAttr ? `width="${btnTableWidthAttr}"` : ""} style="margin: ${btnMargin}; width: ${btnWidthType === 'full' ? '100%' : (btnTableWidthAttr ? btnTableWidthAttr+'px' : 'auto')}; max-width: 100%;">
                    <tr>
                        <td align="center" bgcolor="${d.btnColor || '#007aff'}" style="border-radius: ${radius};">
                            <a href="${d.btnLink || '#'}" target="_blank" style="background-color: ${d.btnColor || '#007aff'}; color: ${d.btnTextColor || '#fff'}; padding: ${d.btnPaddingTop || '12'}px 20px ${d.btnPaddingBottom || '12'}px; text-decoration: none; display: block; font-weight: bold; border-radius: ${radius}; font-size: ${d.btnFontSize || 16}px; font-family: ${designSettings.fontFamily}; text-align: center;">${d.btnText || 'View'}</a>
                        </td>
                    </tr>
                </table>
            `;
            
            detailsHtml += renderField({ text: d.disclaimerText, fontSize: d.disclaimerFontSize, color: d.disclaimerColor, bgColor: d.disclaimerBgColor, fontWeight: 'normal', textAlign: d.disclaimerTextAlign, paddingTop: d.disclaimerPaddingTop, paddingBottom: d.disclaimerPaddingBottom });
            
            return detailsHtml;
        };

        const renderImage = (fixedWidth?: number) => {
            const imgStyles = `display: block; width: 100%; max-width: ${fixedWidth ? `${fixedWidth}px` : '100%'}; height: auto; border: 0;`.replace(/\s/g,'');
            let imgTag = `<img src="${d.imageSrc || ''}" alt="${d.imageAlt || 'Sales Offer'}" ${fixedWidth ? `width="${fixedWidth}"` : ''} style="${imgStyles}" border="0" />`;
            if (d.imageLink) imgTag = `<a href="${d.imageLink}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Email Template</title>
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
  const btnText = generateBtn.querySelector('.btn-text') as HTMLElement;
  const spinner = generateBtn.querySelector('.spinner') as HTMLElement;
  const checkmark = generateBtn.querySelector('.checkmark') as HTMLElement;
  
  if (!btnText || !spinner || !checkmark) return;

  generateBtn.disabled = true;
  btnText.textContent = 'Generating...';
  spinner.classList.remove('hidden');
  
  setTimeout(() => {
    try {
        outputPlaceholder.style.display = 'none';
        outputContainer.style.display = 'grid';
        
        const html = generateEmailHtml();
        const codeBlock = document.getElementById('code-block') as HTMLElement;
        if(codeBlock) codeBlock.textContent = html;
        if(previewPane) previewPane.srcdoc = html;
        
        spinner.classList.add('hidden');
        checkmark.classList.remove('hidden');
        btnText.textContent = 'Complete';
        showToast('Template Generated');
    } catch (err) {
        console.error("Generation failed:", err);
        showToast('Error generating template. Check console.');
        spinner.classList.add('hidden');
    } finally {
        setTimeout(() => {
            generateBtn.disabled = false;
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
    showToast('Copied to clipboard');
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
    showToast('HTML file downloaded');
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
    showToast('Template saved');
};

const deleteTemplate = (id: string) => {
    const templates = getSavedTemplates().filter(t => t.id !== id);
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
    renderSavedTemplates();
    showToast('Template deleted');
};

const loadTemplate = (id: string) => {
    const templates = getSavedTemplates();
    const template = templates.find(t => t.id === id);
    if (template) {
        designSettings = { ...template.designSettings };
        activeComponents = [...template.components];
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        buttonStyleOptions.forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-button') === designSettings.buttonStyle);
        });
        renderComponents();
        saveDraft();
        showToast(`Loaded: ${template.name}`);
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
                buttonStyleOptions.forEach(opt => {
                    opt.classList.toggle('selected', opt.getAttribute('data-button') === designSettings.buttonStyle);
                });
                renderComponents();
            }
        }
    } catch (e) {
        console.error("Failed to load draft", e);
    }
};

const renderStylingPanel = () => {
    if (!dynamicStylingContainer || !activeField) {
        if(dynamicStylingContainer) dynamicStylingContainer.innerHTML = '';
        return;
    }

    const comp = activeComponents.find(c => c.id === activeField.componentId);
    if (!comp) return;
    
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
}

saveTemplateBtn?.addEventListener('click', saveTemplate);
renderMergeFieldsSidebar();
loadDraft();
renderComponents();
renderSavedTemplates();
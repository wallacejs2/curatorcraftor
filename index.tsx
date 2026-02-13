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

const MERGE_FIELDS: MergeFieldGroup[] = [
  {
    title: "Recipient Details",
    items: [
      { label: "First Name", value: "{{recipient.first_name}}" },
      { label: "Last Name", value: "{{recipient.last_name}}" }
    ]
  },
  {
    title: "Last Transaction Vehicle",
    items: [
      { label: "Equity State", value: "{{customer.last_transaction.vehicle.equity_payout_formatted}}" },
      { label: "Year", value: "{{customer.last_transaction.vehicle.year}}" },
      { label: "Make", value: "{{customer.last_transaction.vehicle.make}}" },
      { label: "Model", value: "{{customer.last_transaction.vehicle.model}}" },
      { label: "VIN", value: "{{customer.last_transaction.vehicle.vin}}" }
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
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify({
        designSettings,
        activeComponents
    }));
    triggerPreviewUpdate();
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
            imageSrc: 'https://via.placeholder.com/600x300',
            imageAlt: 'New Sales Offer',
            imageLink: '',
            imageWidth: '100%',
            
            vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}',
            vehicleFontSize: '18',
            vehicleColor: '#1d1d1f',
            vehicleBgColor: 'transparent',
            
            mainOfferText: '$2,500 Trade-In Bonus',
            mainOfferFontSize: '28',
            mainOfferColor: '#007aff',
            mainOfferBgColor: 'transparent',
            
            detailsText: 'Upgrade your current ride today with our exclusive seasonal offer.',
            detailsFontSize: '14',
            detailsColor: '#6e6e73',
            detailsBgColor: 'transparent',
            
            stockVinText: 'VIN: {{customer.last_transaction.vehicle.vin}}',
            stockVinFontSize: '11',
            stockVinColor: '#86868b',
            stockVinBgColor: 'transparent',
            
            disclaimerText: '*Terms and conditions apply. Offer valid through end of month.',
            disclaimerFontSize: '10',
            disclaimerColor: '#86868b',
            disclaimerBgColor: 'transparent',
            
            additionalOffers: '[]',
            
            btnText: 'View Details',
            btnLink: '{{dealership.tracked_website_homepage_url}}',
            btnFontSize: '16',
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
            
            const renderControlCluster = (prefix: string) => `
                <div class="control-cluster">
                    <div class="control-item">
                        <span class="control-label-tiny">Size</span>
                        <input type="number" class="control-input-mini" data-key="${prefix}FontSize" value="${comp.data[prefix + 'FontSize'] || 16}">
                    </div>
                    <div class="control-item">
                        <span class="control-label-tiny">Text</span>
                        <div class="color-input-container mini">
                            <input type="color" class="color-input-hidden" data-key="${prefix}Color" value="${comp.data[prefix + 'Color'] || '#000000'}">
                            <div class="color-swatch-display" style="background: ${comp.data[prefix + 'Color'] || '#000000'}"></div>
                        </div>
                    </div>
                    <div class="control-item">
                        <span class="control-label-tiny">Bg</span>
                        <div class="color-input-container mini">
                            <input type="color" class="color-input-hidden" data-key="${prefix}BgColor" value="${comp.data[prefix + 'BgColor'] || 'transparent'}">
                            <div class="color-swatch-display" style="background: ${comp.data[prefix + 'BgColor'] === 'transparent' ? '#ffffff' : comp.data[prefix + 'BgColor'] || '#ffffff'}"></div>
                        </div>
                    </div>
                </div>
            `;

            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Offer Layout</label>
                    <select class="form-control" data-key="layout">
                        <option value="left" ${comp.data.layout === 'left' ? 'selected' : ''}>Left (Image Left, Details Right)</option>
                        <option value="center" ${comp.data.layout === 'center' ? 'selected' : ''}>Center (Image Top, Details Below)</option>
                        <option value="right" ${comp.data.layout === 'right' ? 'selected' : ''}>Right (Details Left, Image Right)</option>
                    </select>
                </div>
                
                <details class="form-section">
                    <summary>Image Settings</summary>
                    <div class="form-section-content">
                        <div class="form-group">
                            <label class="form-label">Image Source URL</label>
                            <input type="text" class="form-control" data-key="imageSrc" value="${comp.data.imageSrc || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Image Alt Text</label>
                            <input type="text" class="form-control" data-key="imageAlt" value="${comp.data.imageAlt || ''}">
                        </div>
                    </div>
                </details>

                <details class="form-section" open>
                    <summary>Primary Offer Fields</summary>
                    <div class="form-section-content">
                        <div class="offer-field-group">
                            <div class="offer-field-header">
                                <label class="label-prominent">Vehicle Name</label>
                                ${renderControlCluster('vehicle')}
                            </div>
                            <input type="text" class="form-control" data-key="vehicleText" value="${comp.data.vehicleText || ''}">
                        </div>

                        <div class="offer-field-group">
                            <div class="offer-field-header">
                                <label class="label-prominent">Main Offer (e.g. $2,500 Off)</label>
                                ${renderControlCluster('mainOffer')}
                            </div>
                            <input type="text" class="form-control" data-key="mainOfferText" value="${comp.data.mainOfferText || ''}">
                        </div>

                        <div class="offer-field-group">
                            <div class="offer-field-header">
                                <label class="label-prominent">Offer Details</label>
                                ${renderControlCluster('details')}
                            </div>
                            <textarea class="form-control" data-key="detailsText">${comp.data.detailsText || ''}</textarea>
                        </div>
                    </div>
                </details>

                <details class="form-section" ${addOffers.length > 0 ? 'open' : ''}>
                    <summary>Additional Offers (${addOffers.length})</summary>
                    <div class="form-section-content">
                        <div id="additional-offers-list-${comp.id}">
                            ${addOffers.map((o: any, i: number) => `
                                <div class="card mb-4 p-4" style="background: var(--background-secondary);">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="font-bold text-xs">OFFER #${i + 1}</span>
                                        <button type="button" class="btn btn-ghost btn-sm remove-sub-offer" data-index="${i}" style="color: var(--destructive); height: 24px;">Remove</button>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Separator (e.g. AND)</label>
                                        <input type="text" class="form-control sub-offer-field" data-index="${i}" data-field="separator" value="${o.separator || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Title</label>
                                        <input type="text" class="form-control sub-offer-field" data-index="${i}" data-field="offer" value="${o.offer || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Details</label>
                                        <input type="text" class="form-control sub-offer-field" data-index="${i}" data-field="details" value="${o.details || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Disclaimer</label>
                                        <input type="text" class="form-control sub-offer-field" data-index="${i}" data-field="disclaimer" value="${o.disclaimer || ''}">
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm w-full add-sub-offer-btn">Add Additional Offer</button>
                    </div>
                </details>

                <details class="form-section">
                    <summary>Stock/VIN & Disclaimer</summary>
                    <div class="form-section-content">
                        <div class="offer-field-group">
                            <div class="offer-field-header">
                                <label class="label-prominent">Stock # or VIN</label>
                                ${renderControlCluster('stockVin')}
                            </div>
                            <input type="text" class="form-control" data-key="stockVinText" value="${comp.data.stockVinText || ''}">
                        </div>
                        <div class="offer-field-group">
                            <div class="offer-field-header">
                                <label class="label-prominent">Disclaimer</label>
                                ${renderControlCluster('disclaimer')}
                            </div>
                            <textarea class="form-control" data-key="disclaimerText">${comp.data.disclaimerText || ''}</textarea>
                        </div>
                    </div>
                </details>

                <details class="form-section">
                    <summary>Button & Styling</summary>
                    <div class="form-section-content">
                        <div class="form-group">
                            <label class="form-label">Button Text</label>
                            <input type="text" class="form-control" data-key="btnText" value="${comp.data.btnText || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Button Link</label>
                            <input type="text" class="form-control" data-key="btnLink" value="${comp.data.btnLink || ''}">
                        </div>
                        <div class="grid grid-cols-2">
                            <div class="form-group">
                                <label class="form-label">Font Size</label>
                                <input type="number" class="form-control" data-key="btnFontSize" value="${comp.data.btnFontSize || 16}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Button Width Setting</label>
                                <select class="form-control" data-key="btnWidthType">
                                    <option value="full" ${comp.data.btnWidthType === 'full' ? 'selected' : ''}>Full Width (100%)</option>
                                    <option value="auto" ${comp.data.btnWidthType === 'auto' ? 'selected' : ''}>Auto-Sized</option>
                                    <option value="small" ${comp.data.btnWidthType === 'small' ? 'selected' : ''}>Fixed: Small (160px)</option>
                                    <option value="medium" ${comp.data.btnWidthType === 'medium' ? 'selected' : ''}>Fixed: Medium (280px)</option>
                                    <option value="large" ${comp.data.btnWidthType === 'large' ? 'selected' : ''}>Fixed: Large (400px)</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2">
                             <div class="form-group">
                                <label class="form-label">Alignment</label>
                                <select class="form-control" data-key="btnAlign">
                                    <option value="center" ${(!comp.data.btnAlign || comp.data.btnAlign === 'center') ? 'selected' : ''}>Center</option>
                                    <option value="left" ${comp.data.btnAlign === 'left' ? 'selected' : ''}>Left</option>
                                    <option value="right" ${comp.data.btnAlign === 'right' ? 'selected' : ''}>Right</option>
                                </select>
                             </div>
                             <div class="form-group">
                                <label class="form-label">Button Color</label>
                                <div class="color-input-container">
                                    <input type="color" class="color-input-hidden" data-key="btnColor" value="${comp.data.btnColor || '#007aff'}">
                                    <div class="color-swatch-display" style="background: ${comp.data.btnColor || '#007aff'}"></div>
                                </div>
                             </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Text Color</label>
                            <div class="color-input-container">
                                <input type="color" class="color-input-hidden" data-key="btnTextColor" value="${comp.data.btnTextColor || '#ffffff'}">
                                <div class="color-swatch-display" style="background: ${comp.data.btnTextColor || '#ffffff'}"></div>
                            </div>
                        </div>
                    </div>
                </details>
            `;
        }

        item.innerHTML = `
            <div class="card-header">
                <span class="text-xs font-bold uppercase" style="color: var(--label-secondary);">#${index + 1} - ${comp.type.replace('_', ' ')}</span>
                <button type="button" class="btn btn-ghost btn-sm remove-comp-btn" style="color: var(--destructive); height: 24px;">Delete</button>
            </div>
            <div class="card-body">
                ${componentFormHtml}
            </div>
        `;

        // Event Listeners for nested fields (Sales Offer)
        if (comp.type === 'sales_offer') {
            item.querySelector('.add-sub-offer-btn')?.addEventListener('click', () => {
                const current = JSON.parse(comp.data.additionalOffers || '[]');
                current.push({ offer: 'New Offer', details: 'Offer details', separator: 'AND', disclaimer: '' });
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
                    const idx = parseInt(e.target.getAttribute('data-index') || '0');
                    const field = e.target.getAttribute('data-field');
                    const current = JSON.parse(comp.data.additionalOffers || '[]');
                    current[idx][field] = e.target.value;
                    updateComponentData(comp.id, 'additionalOffers', JSON.stringify(current));
                });
            });
        }

        item.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.classList.contains('sub-offer-field')) {
                input.addEventListener('input', (e) => {
                    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                    const key = target.getAttribute('data-key');
                    if (key) {
                        updateComponentData(comp.id, key, target.value);
                        if (target.type === 'color') {
                            const swatch = target.nextElementSibling as HTMLElement;
                            if (swatch) swatch.style.background = target.value;
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
        
        const renderDetails = () => {
            let detailsHtml = '';
            // For side-by-side layouts, generally left-aligned text looks better and is standard.
            const textAlign = layout === 'center' ? 'center' : 'left';
            
            const renderField = (text: string, fontSize: string, color: string, bgColor: string, fontWeight: string, extraStyle: string = '') => {
                if (!text) return '';
                const style = [
                    `font-family: ${designSettings.fontFamily}`,
                    `color: ${color || '#000'}`,
                    `font-size: ${fontSize || 14}px`,
                    `background-color: ${bgColor === 'transparent' ? 'transparent' : bgColor || '#fff'}`,
                    `font-weight: ${fontWeight}`,
                    `text-align: ${textAlign}`,
                    `line-height: 1.2`,
                    extraStyle
                ].join(';');
                return `<div style="${style}">${text}</div>`;
            };

            if(d.vehicleText) detailsHtml += renderField(d.vehicleText, d.vehicleFontSize, d.vehicleColor, d.vehicleBgColor, 'bold', 'margin-bottom: 8px;');
            if(d.mainOfferText) detailsHtml += renderField(d.mainOfferText, d.mainOfferFontSize, d.mainOfferColor, d.mainOfferBgColor, '800', 'margin-bottom: 8px;');
            if(d.detailsText) detailsHtml += renderField(d.detailsText, d.detailsFontSize, d.detailsColor, d.detailsBgColor, 'normal', 'margin-bottom: 12px; line-height: 1.4;');
            
            addOffers.forEach((o: any) => {
                const subSize = d.mainOfferFontSize ? Math.round(parseInt(d.mainOfferFontSize)*0.75).toString() : '14';
                if (o.separator) detailsHtml += `<div style="font-family: ${designSettings.fontFamily}; font-size: 11px; font-weight: 800; color: #8e8e93; margin: 12px 0; text-align: ${textAlign};">${o.separator}</div>`;
                detailsHtml += renderField(o.offer, subSize, d.mainOfferColor, 'transparent', 'bold');
                detailsHtml += renderField(o.details, d.detailsFontSize, d.detailsColor, 'transparent', 'normal', 'margin-bottom: 4px; line-height: 1.4;');
                if (o.disclaimer) detailsHtml += renderField(o.disclaimer, '10', '#8e8e93', 'transparent', 'normal', 'margin-bottom: 8px; opacity: 0.8;');
            });
            
            if (d.stockVinText) detailsHtml += renderField(d.stockVinText, d.stockVinFontSize, d.stockVinColor, d.stockVinBgColor, 'normal', 'margin-top: 10px;');
            
            const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
            
            const btnAlign = d.btnAlign || textAlign;
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
                            <a href="${d.btnLink || '#'}" target="_blank" style="background-color: ${d.btnColor || '#007aff'}; color: ${d.btnTextColor || '#fff'}; padding: 10px 20px; text-decoration: none; display: block; font-weight: bold; border-radius: ${radius}; font-size: ${d.btnFontSize || 16}px; font-family: ${designSettings.fontFamily}; text-align: center;">${d.btnText || 'View'}</a>
                        </td>
                    </tr>
                </table>
            `;
            
            if (d.disclaimerText) detailsHtml += renderField(d.disclaimerText, d.disclaimerFontSize, d.disclaimerColor, d.disclaimerBgColor, 'normal', 'margin-top: 16px; opacity: 0.8;');
            
            return detailsHtml;
        };

        const renderImage = () => {
            const imgStyles = [`display: block`, `max-width: 100%`, `width: 100%`, `height: auto`, `border: 0`].join(';');
            let imgTag = `<img src="${d.imageSrc || ''}" alt="${d.imageAlt || 'Sales Offer'}" style="${imgStyles}" border="0" />`;
            if (d.imageLink) imgTag = `<a href="${d.imageLink}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
            return imgTag;
        };

        if (layout === 'center') {
            sectionsHtml += `
                <tr>
                    <td bgcolor="${d.backgroundColor}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr><td align="center" style="padding-bottom: 20px;">${renderImage()}</td></tr>
                            <tr><td align="center">${renderDetails()}</td></tr>
                        </table>
                    </td>
                </tr>
            `;
        } else {
            // Layout Left or Right
            const isLeft = layout === 'left';
            const isRTL = layout === 'right'; // RTL strategy for Right Layout
            const dir = isRTL ? 'rtl' : 'ltr';
            
            // Calculate available width for columns
            const paddingLR = parseInt(d.paddingLeftRight) || 20;
            const totalContentWidth = 600 - (paddingLR * 2);
            const gutter = 24;
            const availableWidth = totalContentWidth - gutter - 4;
            
            // Split: Image ~44%, Content ~56%
            const imgColWidth = Math.floor(availableWidth * 0.44);
            const textColWidth = availableWidth - imgColWidth;
            
            // Assign Content: Always Image First in Source Order for Mobile Stacking
            const col1Content = renderImage(); // Image is always col1 source
            const col2Content = renderDetails(); // Details is always col2 source
            
            // Assign Widths
            const col1Width = imgColWidth;
            const col2Width = textColWidth;
            
            // Padding Logic
            // If LTR (Left Layout): Image (Left) needs Right Padding. Text (Right) needs Left Padding.
            // If RTL (Right Layout): Image (Right) needs Left Padding. Text (Left) needs Right Padding.
            const p1 = isRTL ? '0 0 0 12px' : '0 12px 0 0';
            const p2 = isRTL ? '0 12px 0 0' : '0 0 0 12px';
            
            // Style refinement to prevent image gaps
            const col1Style = `padding: ${p1}; font-size: 0; line-height: 0;`; 
            const col2Style = `padding: ${p2}; font-size: 14px; line-height: 1.4;`;

            sectionsHtml += `
                <tr>
                    <td bgcolor="${d.backgroundColor || 'transparent'}" style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td style="font-size: 0; text-align: center; direction: ${dir};">
                                    <!--[if (gte mso 9)|(IE)]>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" dir="${dir}">
                                    <tr>
                                    <td width="${col1Width}" valign="top" style="vertical-align: top;">
                                    <![endif]-->
                                    <div class="mobile-stack" style="display: inline-block; width: 100%; max-width: ${col1Width}px; vertical-align: top; direction: ltr;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td class="mobile-padding-reset mobile-padding-bottom" align="left" valign="top" style="${col1Style}">
                                                    ${col1Content}
                                                </td>
                                            </tr>
                                        </table>
                                    </div><!--
                                    --><!--[if (gte mso 9)|(IE)]>
                                    </td>
                                    <td width="${col2Width}" valign="top" style="vertical-align: top;">
                                    <![endif]--><!--
                                    --><div class="mobile-stack" style="display: inline-block; width: 100%; max-width: ${col2Width}px; vertical-align: top; direction: ltr;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td class="mobile-padding-reset" align="left" valign="top" style="${col2Style}">
                                                    ${col2Content}
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <!--[if (gte mso 9)|(IE)]>
                                    </td>
                                    </tr>
                                    </table>
                                    <![endif]-->
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        }
    }
  });

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style type="text/css">
        body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important; -webkit-font-smoothing: antialiased !important; }
        img { border: 0 !important; outline: none !important; text-decoration: none !important; -ms-interpolation-mode: bicubic !important; }
        table { border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
        
        @media screen and (max-width: 600px) {
            .wrapper { width: 100% !important; max-width: 100% !important; }
            .mobile-stack { display: block !important; width: 100% !important; max-width: 100% !important; }
            .mobile-padding-reset { padding-left: 0 !important; padding-right: 0 !important; }
            .mobile-padding-bottom { padding-bottom: 24px !important; }
            .mobile-center { text-align: center !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7;">
    <center>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f5f7">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                        ${sectionsHtml || '<tr><td style="padding: 40px; text-align: center; font-family: sans-serif;">No content added yet.</td></tr>'}
                    </table>
                </td>
            </tr>
        </table>
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

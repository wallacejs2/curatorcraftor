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
            widthType: 'full' // Default is full width
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
            <div id="empty-state-message" style="text-align: center; padding: 40px 20px; border: 2px dashed var(--separator-secondary); border-radius: var(--radius-lg); color: var(--label-secondary);">
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
                    <textarea class="form-control" data-key="text">${comp.data.text}</textarea>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size (px)</label>
                        <input type="number" class="form-control" data-key="fontSize" value="${comp.data.fontSize}">
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
                            <input type="color" class="color-input-hidden" data-key="textColor" value="${comp.data.textColor.startsWith('#') ? comp.data.textColor : '#1d1d1f'}">
                            <div class="color-swatch-display" style="background: ${comp.data.textColor}"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Background Color</label>
                        <div class="color-input-container">
                            <input type="color" class="color-input-hidden" data-key="backgroundColor" value="${comp.data.backgroundColor === 'transparent' ? '#ffffff' : comp.data.backgroundColor}">
                            <div class="color-swatch-display" style="background: ${comp.data.backgroundColor === 'transparent' ? '#ffffff' : comp.data.backgroundColor}"></div>
                        </div>
                        <button type="button" class="btn btn-ghost btn-xs transparent-bg-btn" style="margin-top: 4px; font-size: 10px; height: 20px;">Transparent</button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Formatting</label>
                    <div class="toggle-group" style="width: fit-content;">
                        <button type="button" class="toggle-btn format-toggle ${comp.data.fontWeight === 'bold' ? 'active' : ''}" data-key="fontWeight" data-val-on="bold" data-val-off="normal">B</button>
                        <button type="button" class="toggle-btn format-toggle ${comp.data.fontStyle === 'italic' ? 'active' : ''}" data-key="fontStyle" data-val-on="italic" data-val-off="normal">I</button>
                        <button type="button" class="toggle-btn format-toggle ${comp.data.textDecoration === 'underline' ? 'active' : ''}" data-key="textDecoration" data-val-on="underline" data-val-off="none">U</button>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding Top</label>
                        <input type="number" class="form-control" data-key="paddingTop" value="${comp.data.paddingTop}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding Bottom</label>
                        <input type="number" class="form-control" data-key="paddingBottom" value="${comp.data.paddingBottom}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control" data-key="paddingLeftRight" value="${comp.data.paddingLeftRight}">
                    </div>
                </div>
            `;
        } else if (comp.type === 'image') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Image Source (URL)</label>
                    <input type="text" class="form-control" data-key="src" value="${comp.data.src}">
                </div>
                <div class="form-group">
                    <label class="form-label">Or Upload Image</label>
                    <input type="file" class="form-control" accept="image/*" data-upload-id="${comp.id}">
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Alt Text</label>
                        <input type="text" class="form-control" data-key="alt" value="${comp.data.alt}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Link URL</label>
                        <input type="text" class="form-control" data-key="link" value="${comp.data.link}">
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Width (%)</label>
                        <input type="text" class="form-control" data-key="width" value="${comp.data.width.includes('%') ? comp.data.width : comp.data.width + '%'}" placeholder="e.g. 100%">
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
                        <label class="form-label">Padding Top</label>
                        <input type="number" class="form-control" data-key="paddingTop" value="${comp.data.paddingTop}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding Bottom</label>
                        <input type="number" class="form-control" data-key="paddingBottom" value="${comp.data.paddingBottom}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control" data-key="paddingLeftRight" value="${comp.data.paddingLeftRight}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Section Background Color</label>
                    <div class="color-input-container">
                        <input type="color" class="color-input-hidden" data-key="backgroundColor" value="${comp.data.backgroundColor === 'transparent' ? '#ffffff' : comp.data.backgroundColor}">
                        <div class="color-swatch-display" style="background: ${comp.data.backgroundColor === 'transparent' ? '#ffffff' : comp.data.backgroundColor}"></div>
                    </div>
                    <button type="button" class="btn btn-ghost btn-xs transparent-bg-btn" style="margin-top: 4px; font-size: 10px; height: 20px;">Transparent</button>
                </div>
                <div class="image-preview-container" style="margin-top: 12px; text-align: center; border: 1px solid var(--separator-secondary); border-radius: var(--radius-md); padding: 8px; background: var(--background-secondary);">
                    <img src="${comp.data.src}" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: 4px;">
                </div>
            `;
        } else if (comp.type === 'button') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Button Text</label>
                    <input type="text" class="form-control" data-key="text" value="${comp.data.text}">
                </div>
                <div class="form-group">
                    <label class="form-label">Button Link</label>
                    <input type="text" class="form-control" data-key="link" value="${comp.data.link}">
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label class="form-label">Font Size</label>
                        <input type="number" class="form-control" data-key="fontSize" value="${comp.data.fontSize}">
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
                            <input type="color" class="color-input-hidden" data-key="textColor" value="${comp.data.textColor}">
                            <div class="color-swatch-display" style="background: ${comp.data.textColor}"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Button Color</label>
                        <div class="color-input-container">
                            <input type="color" class="color-input-hidden" data-key="backgroundColor" value="${comp.data.backgroundColor}">
                            <div class="color-swatch-display" style="background: ${comp.data.backgroundColor}"></div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label class="form-label">Padding Top</label>
                        <input type="number" class="form-control" data-key="paddingTop" value="${comp.data.paddingTop}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding Bottom</label>
                        <input type="number" class="form-control" data-key="paddingBottom" value="${comp.data.paddingBottom}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Padding L/R</label>
                        <input type="number" class="form-control" data-key="paddingLeftRight" value="${comp.data.paddingLeftRight}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Alignment</label>
                    <select class="form-control" data-key="align">
                        <option value="left" ${comp.data.align === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${comp.data.align === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${comp.data.align === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="card-header" style="background: var(--background-tertiary); min-height: 40px;">
                <span class="text-sm font-bold" style="text-transform: uppercase; color: var(--label-secondary);">
                    #${index + 1} - ${comp.type.replace('_', ' ')}
                </span>
                <button type="button" class="btn btn-ghost btn-sm remove-comp-btn" style="height: 24px; padding: 0 8px; color: var(--destructive); border-color: transparent;">
                    Remove
                </button>
            </div>
            <div class="card-body">
                ${componentFormHtml}
            </div>
        `;

        item.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                const key = target.getAttribute('data-key');
                if (key) {
                    let val = target.value;
                    if (comp.type === 'image' && key === 'width' && !val.includes('%') && val !== '') {
                        val = val + '%';
                    }
                    updateComponentData(comp.id, key, val);
                    if (target.type === 'color') {
                        const swatch = target.nextElementSibling as HTMLElement;
                        if (swatch) swatch.style.background = target.value;
                    }
                    if (comp.type === 'image' && key === 'src') {
                        const previewImg = item.querySelector('.image-preview-container img') as HTMLImageElement;
                        if (previewImg) previewImg.src = target.value;
                    }
                }
            });
        });

        const fileInput = item.querySelector(`[data-upload-id="${comp.id}"]`) as HTMLInputElement;
        fileInput?.addEventListener('change', (e) => {
            const file = fileInput.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const base64 = re.target?.result as string;
                    updateComponentData(comp.id, 'src', base64);
                    const urlInput = item.querySelector('[data-key="src"]') as HTMLInputElement;
                    if (urlInput) urlInput.value = base64;
                    const previewImg = item.querySelector('.image-preview-container img') as HTMLImageElement;
                    if (previewImg) previewImg.src = base64;
                    showToast('Image uploaded');
                };
                reader.readAsDataURL(file);
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

        item.querySelector('.transparent-bg-btn')?.addEventListener('click', () => {
            updateComponentData(comp.id, 'backgroundColor', 'transparent');
            const swatch = item.querySelector('[data-key="backgroundColor"]')?.nextElementSibling as HTMLElement;
            if (swatch) swatch.style.background = 'transparent';
            showToast('Background set to transparent');
        });

        item.querySelector('.remove-comp-btn')?.addEventListener('click', () => removeComponent(comp.id));
        componentsContainer.appendChild(item);
    });
};

const generateEmailHtml = (): string => {
  let sectionsHtml = '';
  
  activeComponents.forEach(comp => {
    const d = comp.data;
    const isTransparent = d.backgroundColor === 'transparent';
    
    if (comp.type === 'header' || comp.type === 'text_block') {
      const styles = [
          `padding: ${d.paddingTop}px ${d.paddingLeftRight}px ${d.paddingBottom}px ${d.paddingLeftRight}px`,
          `background-color: ${d.backgroundColor}`,
          `color: ${d.textColor}`,
          `font-size: ${d.fontSize}px`,
          `text-align: ${d.textAlign}`,
          `font-weight: ${d.fontWeight}`,
          `font-style: ${d.fontStyle}`,
          `text-decoration: ${d.textDecoration}`,
          `line-height: 1.5`,
          `font-family: ${designSettings.fontFamily}`
      ].join(';');
      
      let htmlContent = '';
      const lines = d.text.split('\n');
      let currentListType: 'ul' | 'ol' | null = null;
      let listBuffer: string[] = [];

      const flushList = () => {
          if (currentListType && listBuffer.length > 0) {
              const listTag = currentListType;
              const listStyles = `margin: 0; padding-left: 24px; text-align: ${d.textAlign};`;
              htmlContent += `<${listTag} style="${listStyles}">` + 
                            listBuffer.map(item => `<li>${item}</li>`).join('') + 
                            `</${listTag}>`;
              listBuffer = [];
              currentListType = null;
          }
      };

      lines.forEach(line => {
          const bulletMatch = line.match(/^(\s*)([•\*\-])\s+(.*)/);
          const numberMatch = line.match(/^(\s*)(\d+[\.\)])\s+(.*)/);

          if (bulletMatch) {
              if (currentListType === 'ol') flushList();
              currentListType = 'ul';
              listBuffer.push(bulletMatch[3]);
          } else if (numberMatch) {
              if (currentListType === 'ul') flushList();
              currentListType = 'ol';
              listBuffer.push(numberMatch[3]);
          } else {
              flushList();
              if (line.trim() === '') {
                  htmlContent += '<br>';
              } else {
                  htmlContent += line + '<br>';
              }
          }
      });
      flushList();
      
      sectionsHtml += `
        <tr>
            <td align="${d.textAlign}" bgcolor="${isTransparent ? '' : d.backgroundColor}" style="${styles}">
                <div style="font-family: ${designSettings.fontFamily}; color: ${d.textColor}; font-size: ${d.fontSize}px; line-height: 1.5;">
                    ${htmlContent}
                </div>
            </td>
        </tr>
      `;
    } else if (comp.type === 'image') {
        const numericWidth = parseFloat(d.width.replace(/%/g, '')) || 100;
        
        // Map percentage to pixels for the width attribute (Outlook compatibility)
        const htmlWidthAttr = Math.round((numericWidth / 100) * 600).toString();
        const styleWidth = `${numericWidth}%`;
        
        const containerStyles = [
            `padding: ${d.paddingTop}px ${d.paddingLeftRight}px ${d.paddingBottom}px ${d.paddingLeftRight}px`,
            `background-color: ${d.backgroundColor}`,
            `text-align: ${d.align}`,
            `font-size: 0`, // Remove ghost spacing
            `line-height: 0` // Remove ghost spacing
        ].join(';');
        
        const imgStyles = [
            `display: block`,
            `max-width: 100%`,
            `width: ${styleWidth}`,
            `height: auto`,
            `border: 0`,
            `margin: ${d.align === 'center' ? '0 auto' : '0'}`
        ].join(';');

        let imgTag = `<img src="${d.src}" alt="${d.alt.replace(/"/g, '&quot;')}" width="${htmlWidthAttr}" height="auto" style="${imgStyles}" border="0" />`;
        if (d.link) imgTag = `<a href="${d.link}" target="_blank" style="text-decoration: none; border: 0;">${imgTag}</a>`;
        
        sectionsHtml += `
            <tr>
                <td align="${d.align}" bgcolor="${isTransparent ? '' : d.backgroundColor}" style="${containerStyles}">
                    <!--[if (gte mso 9)|(IE)]>
                    <table width="${htmlWidthAttr}" align="${d.align}" border="0" cellspacing="0" cellpadding="0" style="margin: ${d.align === 'center' ? '0 auto' : '0'};">
                        <tr>
                            <td>
                    <![endif]-->
                    <div style="display: block; width: 100%; max-width: ${styleWidth};">
                        ${imgTag}
                    </div>
                    <!--[if (gte mso 9)|(IE)]>
                            </td>
                        </tr>
                    </table>
                    <![endif]-->
                </td>
            </tr>
        `;
    } else if (comp.type === 'button') {
        const radius = designSettings.buttonStyle === 'pill' ? '50px' : designSettings.buttonStyle === 'square' ? '0px' : '8px';
        const isOutlined = designSettings.buttonStyle === 'outlined';
        
        // Sizing logic
        let tableWidthAttr = "100%";
        let maxWidthStyle = "100%";
        
        const widthType = d.widthType || 'full';
        if (widthType === 'auto') {
            tableWidthAttr = ""; // Allow content to fit
            maxWidthStyle = "fit-content";
        } else if (widthType === 'small') {
            tableWidthAttr = "160";
            maxWidthStyle = "160px";
        } else if (widthType === 'medium') {
            tableWidthAttr = "280";
            maxWidthStyle = "280px";
        } else if (widthType === 'large') {
            tableWidthAttr = "400";
            maxWidthStyle = "400px";
        }

        const btnStyles = [
            `background-color: ${isOutlined ? '#ffffff' : d.backgroundColor}`,
            `color: ${isOutlined ? d.backgroundColor : d.textColor}`,
            `padding: 12px 24px`,
            `text-decoration: none`,
            `display: block`,
            `font-weight: bold`,
            `border-radius: ${radius}`,
            `font-size: ${d.fontSize}px`,
            `font-family: ${designSettings.fontFamily}`,
            `text-align: center`,
            isOutlined ? `border: 2px solid ${d.backgroundColor}` : 'border: 0'
        ].join(';');
        
        const containerStyles = [
            `padding: ${d.paddingTop}px ${d.paddingLeftRight}px ${d.paddingBottom}px ${d.paddingLeftRight}px`,
            `text-align: ${d.align}`
        ].join(';');

        sectionsHtml += `
            <tr>
                <td align="${d.align}" style="${containerStyles}">
                    <table border="0" cellspacing="0" cellpadding="0" ${tableWidthAttr ? `width="${tableWidthAttr}"` : ""} style="margin: ${d.align === 'center' ? '0 auto' : '0'}; ${maxWidthStyle ? `max-width: ${maxWidthStyle};` : ""} ${widthType === 'full' ? 'width: 100%;' : ""}">
                        <tr>
                            <td align="center" bgcolor="${isOutlined ? '#ffffff' : d.backgroundColor}" style="border-radius: ${radius};">
                                <a href="${d.link}" target="_blank" style="${btnStyles}">
                                    ${d.text}
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `;
    }
  });

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if !mso]><!-->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <!--<![endif]-->
    <title>Email Template</title>
    <style type="text/css">
        body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-text-size-adjust: 100% !important;
            -ms-text-size-adjust: 100% !important;
            -webkit-font-smoothing: antialiased !important;
        }
        img {
            border: 0 !important;
            outline: none !important;
            text-decoration: none !important;
            -ms-interpolation-mode: bicubic !important;
        }
        table {
            border-collapse: collapse !important;
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }
        td {
            mso-line-height-rule: exactly !important;
        }
        .wrapper {
            width: 100% !important;
            max-width: 600px !important;
        }
        @media screen and (max-width: 600px) {
            .wrapper {
                width: 100% !important;
                max-width: 100% !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7;">
    <center>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f5f7" style="table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <!--[if (gte mso 9)|(IE)]>
                    <table width="600" align="center" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td>
                    <![endif]-->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" class="wrapper" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        ${sectionsHtml || '<tr><td style="padding: 40px; text-align: center; color: #86868b; font-family: sans-serif;">No content added yet.</td></tr>'}
                    </table>
                    <!--[if (gte mso 9)|(IE)]>
                            </td>
                        </tr>
                    </table>
                    <![endif]-->
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`.trim();
};

emailForm.addEventListener('submit', (e: Event) => {
  e.preventDefault();
  const btnText = generateBtn.querySelector('.btn-text') as HTMLElement;
  const spinner = generateBtn.querySelector('.spinner') as HTMLElement;
  const checkmark = generateBtn.querySelector('.checkmark') as HTMLElement;
  generateBtn.disabled = true;
  btnText.textContent = 'Generating...';
  spinner.classList.remove('hidden');
  
  setTimeout(() => {
    outputPlaceholder.style.display = 'none';
    outputContainer.style.display = 'grid';
    const html = generateEmailHtml();
    const codeBlock = document.getElementById('code-block') as HTMLElement;
    codeBlock.textContent = html;
    previewPane.srcdoc = html;
    spinner.classList.add('hidden');
    checkmark.classList.remove('hidden');
    btnText.textContent = 'Complete';
    showToast('Template Generated');
    setTimeout(() => {
        generateBtn.disabled = false;
        checkmark.classList.add('hidden');
        btnText.textContent = 'Generate Template';
    }, 2000);
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

// Template Management
const getSavedTemplates = (): SavedTemplate[] => {
    const data = localStorage.getItem(LS_TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
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
    showToast('Template saved successfully');
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
        
        // Update font select UI
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        // Update button style UI
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
                    <button class="btn btn-ghost btn-sm del-tpl-btn" data-id="${t.id}" style="color: var(--destructive);">Delete</button>
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

const saveDraft = () => {
    const draft = { designSettings, activeComponents };
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draft));
};

const loadDraft = () => {
    const data = localStorage.getItem(LS_DRAFT_KEY);
    if (data) {
        const draft = JSON.parse(data);
        designSettings = draft.designSettings;
        activeComponents = draft.activeComponents;
        
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        buttonStyleOptions.forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-button') === designSettings.buttonStyle);
        });
        
        renderComponents();
        showToast('Draft restored');
    }
};

// Initialization
saveTemplateBtn?.addEventListener('click', saveTemplate);
renderMergeFieldsSidebar();
loadDraft();
renderComponents();
renderSavedTemplates();

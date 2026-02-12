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

// Interface for LocalStorage data
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

/* ... (Merge Fields Data) ... */
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
const designSettings: DesignSettings = {
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

// Fix Design Customization Logic
fontSelect?.addEventListener('change', () => {
    designSettings.fontFamily = fontSelect.value;
    showToast('Font updated');
});

buttonStyleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        buttonStyleOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        designSettings.buttonStyle = opt.getAttribute('data-button') || 'rounded';
        showToast('Button style updated');
    });
});

// Fix View Toggles
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

/* ... (Merge Field Functions) ... */
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
        const summary = document.createElement('summary');
        summary.textContent = group.title;
        details.appendChild(summary);
        const content = document.createElement('div');
        content.className = 'sidebar-group-content';
        const createItemEl = (item: MergeFieldItem) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'merge-field-item';
            itemEl.innerHTML = `<span>${item.label}</span><span class="merge-field-code">${item.value}</span>`;
            itemEl.addEventListener('click', () => insertMergeField(item.value));
            return itemEl;
        };
        if (group.items) group.items.forEach(item => content.appendChild(createItemEl(item)));
        if (group.subgroups) {
            group.subgroups.forEach(sub => {
                const subHeader = document.createElement('div');
                subHeader.style.cssText = 'font-size: 12px; font-weight: 600; color: var(--label-secondary); margin-top: 8px; margin-bottom: 4px; text-transform: uppercase;';
                subHeader.textContent = sub.title;
                content.appendChild(subHeader);
                sub.items.forEach(item => content.appendChild(createItemEl(item)));
            });
        }
        details.appendChild(content);
        contentContainer.appendChild(details);
    });
};
renderMergeFieldsSidebar();

// Sidebar/Modal Management
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

// Component Management
const removeComponent = (id: string) => {
    activeComponents = activeComponents.filter(c => c.id !== id);
    renderComponents();
    showToast('Section removed');
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
                <p class="text-xs" style="color: var(--label-tertiary);">Section configuration will appear here once defined.</p>
            </div>
        `;
        item.querySelector('.remove-comp-btn')?.addEventListener('click', () => removeComponent(comp.id));
        componentsContainer.appendChild(item);
    });
};

// Initial render
renderComponents();

// --- Simple Save/Load Logic ---
const STORAGE_KEY = 'cc_email_builder_templates';

const getSavedTemplates = (): SavedTemplate[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
};

const deleteTemplate = (id: string) => {
    const templates = getSavedTemplates().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    renderSavedTemplatesList();
    showToast('Template deleted');
};

const renderSavedTemplatesList = () => {
    if (!savedTemplatesList) return;
    const templates = getSavedTemplates();
    savedTemplatesList.innerHTML = '';
    if (templates.length === 0) {
        savedTemplatesList.innerHTML = '<p class="text-gray-500 text-sm" style="text-align: center;">No saved templates.</p>';
        return;
    }
    templates.forEach(t => {
        const div = document.createElement('div');
        div.className = 'saved-template-item p-2 border-b flex justify-between items-center';
        div.innerHTML = `
            <div>
                <div class="font-bold">${t.name}</div>
                <div class="text-xs text-gray-500">${new Date(t.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="flex gap-2">
                <button class="btn btn-xs btn-secondary btn-sm delete-btn" style="color: var(--destructive);">Delete</button>
            </div>
        `;
        div.querySelector('.delete-btn')?.addEventListener('click', () => deleteTemplate(t.id));
        savedTemplatesList.appendChild(div);
    });
};

saveTemplateBtn.addEventListener('click', () => {
    const name = prompt('Enter template name:');
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    renderSavedTemplatesList();
    showToast('Template Saved!');
});
renderSavedTemplatesList();

// --- Generate Email Stub ---
const generateEmailHtml = (data: any): string => {
  return `<!DOCTYPE html><html><body style="margin: 0; padding: 0; font-family: ${designSettings.fontFamily};"><div style="padding: 40px; text-align: center; background: #f5f5f7;"><h1>Email Shell Ready</h1><p>Active Sections: ${activeComponents.length}</p><p>Button Style: ${designSettings.buttonStyle}</p></div></body></html>`;
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
    const html = generateEmailHtml({});
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
  }, 800);
});

copyBtn?.addEventListener('click', async () => {
  const codeBlock = document.getElementById('code-block') as HTMLElement;
  try {
    await navigator.clipboard.writeText(codeBlock.textContent || '');
    showToast('Copied to clipboard');
  } catch (err) { console.error(err); }
});

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
  globalBodyColor: string;
  globalLinkColor: string;
  globalFontSize: string;
  colorScheme?: string;
}

const COLOR_SCHEMES = [
  { id: 'classic',  name: 'Classic',   bodyColor: '#1d1d1f', accentColor: '#007aff' },
  { id: 'midnight', name: 'Midnight',  bodyColor: '#0a0a0a', accentColor: '#f5a623' },
  { id: 'ocean',    name: 'Ocean',     bodyColor: '#1e3a5f', accentColor: '#00b4d8' },
  { id: 'forest',   name: 'Forest',    bodyColor: '#1b4332', accentColor: '#52b788' },
  { id: 'slate',    name: 'Slate',     bodyColor: '#2d3748', accentColor: '#667eea' },
  { id: 'ember',    name: 'Ember',     bodyColor: '#2d2d2d', accentColor: '#e53e3e' },
  { id: 'rosegold', name: 'Rose Gold', bodyColor: '#3d1515', accentColor: '#c9657e' },
  { id: 'mono',     name: 'Mono',      bodyColor: '#000000', accentColor: '#666666' },
] as const;

interface SavedTemplate {
    id: string;
    name: string;
    createdAt: string;
    designSettings: DesignSettings;
    components: EmailComponent[];
}

interface SavedLibraryComponent {
    id: string;
    name: string;
    type: string;
    data: Record<string, string>;
    createdAt: string;
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

const CONTENT_KEYS: Record<string, string[]> = {
    header:        ['text'],
    text_block:    ['text'],
    disclaimers:   ['text'],
    button:        ['text', 'link'],
    image:         ['src', 'alt', 'link'],
    divider:       [],
    spacer:        [],
    service_offer: [
        'showImage', 'imageUrl', 'imageAlt', 'imageLink',
        'serviceTitle', 'couponCode', 'serviceDetails', 'disclaimer',
        'buttonText', 'buttonLink',
        'showImage2', 'imageUrl2', 'imageAlt2', 'imageLink2',
        'serviceTitle2', 'couponCode2', 'serviceDetails2', 'disclaimer2',
        'buttonText2', 'buttonLink2',
    ],
    sales_offer: [
        'imageEnabled', 'imageSrc', 'imageAlt', 'imageLink', 'imageWidth',
        'vehicleText', 'mainOfferText', 'detailsText',
        'stockVinType', 'stockVinValue', 'mileageValue',
        'disclaimerText', 'additionalOffers', 'btnText', 'btnLink',
        'imageEnabled2', 'imageSrc2', 'imageAlt2', 'imageLink2', 'imageWidth2',
        'vehicleText2', 'mainOfferText2', 'detailsText2',
        'stockVinType2', 'stockVinValue2', 'mileageValue2',
        'disclaimerText2', 'additionalOffers2', 'btnText2', 'btnLink2',
    ],
    footer: ['links'],
};
const STRUCTURAL_KEYS = ['layout', 'textLayout'];

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

interface FlatMergeFieldItem {
  label: string;
  value: string;
  group: string;
  subgroup?: string;
  searchText: string;
}

const FLAT_MERGE_FIELDS: FlatMergeFieldItem[] = (() => {
  const result: FlatMergeFieldItem[] = [];
  MERGE_FIELDS.forEach(group => {
    if (group.items) {
      group.items.forEach(item => {
        result.push({
          label: item.label,
          value: item.value,
          group: group.title,
          searchText: `${item.label} ${item.value}`.toLowerCase()
        });
      });
    }
    if (group.subgroups) {
      group.subgroups.forEach(sub => {
        sub.items.forEach(item => {
          result.push({
            label: item.label,
            value: item.value,
            group: group.title,
            subgroup: sub.title,
            searchText: `${item.label} ${item.value}`.toLowerCase()
          });
        });
      });
    }
  });
  return result;
})();

// Application State
let designSettings: DesignSettings = {
  fontFamily: "'Arial', sans-serif",
  buttonStyle: 'rounded',
  offersLayout: 'list',
  globalBodyColor: '#1d1d1f',
  globalLinkColor: '#007aff',
  globalFontSize: '14',
  colorScheme: 'classic'
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
const collapseAllBtn = document.getElementById('collapse-all-btn');
const floatingMergeBtn = document.getElementById('floating-merge-btn');

// View Toggles
const desktopViewBtn = document.getElementById('desktop-view-btn');
const mobileViewBtn = document.getElementById('mobile-view-btn');

// Close buttons
const closeDesignSidebar = document.getElementById('close-design-sidebar');
const closeMergeSidebar = document.getElementById('close-sidebar');

// Right Panel Elements
const rightPanel = document.getElementById('right-panel');
const rightPanelOverlay = document.getElementById('right-panel-overlay');
const closeRightPanel = document.getElementById('close-right-panel');
const floatingPanelBtn = document.getElementById('floating-panel-btn');

// Design Settings Controls
const fontSelect = document.getElementById('design-font-family') as HTMLSelectElement;

// Saved Template Elements
const saveTemplateBtn = document.getElementById('save-template-btn') as HTMLButtonElement;
const savedTemplatesList = document.getElementById('saved-templates-list') as HTMLElement;
const componentLibraryList = document.getElementById('component-library-list') as HTMLElement;

const ALIGNMENT_ICONS = {
    left: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>`,
    center: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="7" y2="18"></line></svg>`,
    right: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>`
};

// Toast Notification
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', onUndo?: () => void) => {
    let toastWrapper = document.getElementById('toast-wrapper');
    if (!toastWrapper) {
        toastWrapper = document.createElement('div');
        toastWrapper.id = 'toast-wrapper';
        toastWrapper.className = 'toast-wrapper';
        document.body.appendChild(toastWrapper);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}${onUndo ? ' toast--undoable' : ''}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const icons = {
        success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        info: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    toast.innerHTML = `
        ${icons[type]}
        <span>${message}</span>
        ${onUndo ? '<button class="toast-undo-btn">Undo</button>' : ''}
    `;

    toastWrapper.appendChild(toast);

    if (onUndo) {
        const undoBtn = toast.querySelector('.toast-undo-btn') as HTMLButtonElement;
        undoBtn.addEventListener('click', () => {
            onUndo();
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
                if (toastWrapper && !toastWrapper.hasChildNodes()) {
                    toastWrapper.remove();
                }
            }, { once: true });
        });
    }

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const dismissDelay = onUndo ? 5000 : 3000;
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
            if (toastWrapper && !toastWrapper.hasChildNodes()) {
                toastWrapper.remove();
            }
        }, { once: true });
    }, dismissDelay);
}


// Local Storage Keys
const LS_TEMPLATES_KEY = 'craftor_saved_templates';
const LS_DRAFT_KEY = 'craftor_current_draft';
const LS_COLLAPSED_KEY = 'craftor_component_states';
const LS_LIBRARY_KEY = 'craftor_component_library';


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

const updateCollapseAllBtn = () => {
    if (!collapseAllBtn) return;
    const allCollapsed = activeComponents.length > 0 && activeComponents.every(c => collapsedStates[c.id]);
    collapseAllBtn.textContent = allCollapsed ? 'Expand All' : 'Collapse All';
};

collapseAllBtn?.addEventListener('click', () => {
    const allCollapsed = activeComponents.length > 0 && activeComponents.every(c => collapsedStates[c.id]);
    activeComponents.forEach(c => {
        collapsedStates[c.id] = !allCollapsed;
    });
    saveCollapsedStates();
    renderComponents();
    updateCollapseAllBtn();
});

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

// --- Autocomplete State ---
let autocompleteDropdown: HTMLElement | null = null;
let autocompleteVisible = false;
let autocompleteSelectedIndex = -1;
let autocompleteFilteredItems: FlatMergeFieldItem[] = [];
let autocompleteTriggerStart = -1;
let autocompleteTargetInput: HTMLInputElement | HTMLTextAreaElement | null = null;

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

// --- Merge Field Autocomplete ---

const filterMergeFields = (query: string): FlatMergeFieldItem[] => {
  if (!query) return FLAT_MERGE_FIELDS;
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return FLAT_MERGE_FIELDS;
  return FLAT_MERGE_FIELDS.filter(item => item.searchText.includes(lowerQuery));
};

const highlightMatch = (text: string, query: string): string => {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) return text;
  const before = text.substring(0, matchIndex);
  const match = text.substring(matchIndex, matchIndex + query.length);
  const after = text.substring(matchIndex + query.length);
  return `${before}<span class="match-highlight">${match}</span>${after}`;
};

const positionAutocomplete = (inputEl: HTMLInputElement | HTMLTextAreaElement) => {
  if (!autocompleteDropdown) return;
  const rect = inputEl.getBoundingClientRect();
  const dropdownHeight = 350;
  const viewportHeight = window.innerHeight;

  let top = rect.bottom + window.scrollY + 4;
  let left = rect.left + window.scrollX;

  if (rect.bottom + dropdownHeight > viewportHeight) {
    top = rect.top + window.scrollY - dropdownHeight - 4;
  }

  const dropdownWidth = 300;
  if (left + dropdownWidth > window.innerWidth) {
    left = window.innerWidth - dropdownWidth - 8;
  }

  autocompleteDropdown.style.top = `${top}px`;
  autocompleteDropdown.style.left = `${left}px`;
};

const renderAutocompleteDropdown = (items: FlatMergeFieldItem[], query: string) => {
  if (!autocompleteDropdown) {
    autocompleteDropdown = document.getElementById('autocomplete-dropdown');
  }
  if (!autocompleteDropdown) return;

  if (items.length === 0) {
    hideAutocomplete();
    return;
  }

  let html = '<div class="autocomplete-list">';
  let currentGroup = '';
  let itemIndex = 0;

  items.forEach((item) => {
    const groupKey = item.subgroup ? `${item.group} \u203A ${item.subgroup}` : item.group;
    if (groupKey !== currentGroup) {
      currentGroup = groupKey;
      html += `<div class="autocomplete-group-header">${groupKey}</div>`;
    }

    const highlightedLabel = highlightMatch(item.label, query);
    const selectedClass = itemIndex === autocompleteSelectedIndex ? ' selected' : '';

    html += `<div class="autocomplete-item${selectedClass}" data-index="${itemIndex}">
      <span class="autocomplete-item-name">${highlightedLabel}</span>
    </div>`;
    itemIndex++;
  });

  html += '</div>';
  html += `<div class="autocomplete-footer">
    <span><kbd>\u2191</kbd><kbd>\u2193</kbd> navigate</span>
    <span><kbd>Enter</kbd> select</span>
    <span><kbd>Esc</kbd> close</span>
  </div>`;

  autocompleteDropdown.innerHTML = html;

  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const idx = parseInt((el as HTMLElement).dataset.index || '0');
      selectAutocompleteItem(idx);
    });
  });
};

const showAutocomplete = (inputEl: HTMLInputElement | HTMLTextAreaElement) => {
  if (!autocompleteDropdown) {
    autocompleteDropdown = document.getElementById('autocomplete-dropdown');
  }
  if (!autocompleteDropdown) return;
  autocompleteTargetInput = inputEl;
  positionAutocomplete(inputEl);
  autocompleteDropdown.classList.add('visible');
  autocompleteVisible = true;
};

const hideAutocomplete = () => {
  if (!autocompleteDropdown) return;
  autocompleteDropdown.classList.remove('visible');
  autocompleteVisible = false;
  autocompleteSelectedIndex = -1;
  autocompleteTriggerStart = -1;
  autocompleteTargetInput = null;
  autocompleteFilteredItems = [];
};

const selectAutocompleteItem = (index: number) => {
  const item = autocompleteFilteredItems[index];
  if (!item || !autocompleteTargetInput) return;
  if (!document.contains(autocompleteTargetInput)) {
    hideAutocomplete();
    return;
  }

  const input = autocompleteTargetInput;
  const text = input.value;
  const cursorPos = input.selectionStart || 0;

  const before = text.substring(0, autocompleteTriggerStart);
  const after = text.substring(cursorPos);

  input.value = before + item.value + after;

  const newCursorPos = autocompleteTriggerStart + item.value.length;
  input.selectionStart = input.selectionEnd = newCursorPos;
  input.focus();

  input.dispatchEvent(new Event('input', { bubbles: true }));
  hideAutocomplete();
};

const updateAutocompleteSelection = () => {
  if (!autocompleteDropdown) return;
  const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  items.forEach((el, i) => {
    el.classList.toggle('selected', i === autocompleteSelectedIndex);
  });
  const selectedEl = items[autocompleteSelectedIndex] as HTMLElement;
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
};

// Autocomplete: detect '{{' trigger on input
document.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;

  const input = target as HTMLInputElement | HTMLTextAreaElement;
  const cursorPos = input.selectionStart;
  if (cursorPos === null) return;

  const text = input.value;
  const textBeforeCursor = text.substring(0, cursorPos);

  const lastTrigger = textBeforeCursor.lastIndexOf('{{');

  if (lastTrigger === -1) {
    if (autocompleteVisible) hideAutocomplete();
    return;
  }

  const textAfterTrigger = textBeforeCursor.substring(lastTrigger);
  if (textAfterTrigger.includes('}}')) {
    if (autocompleteVisible) hideAutocomplete();
    return;
  }

  const query = textBeforeCursor.substring(lastTrigger + 2);

  autocompleteTriggerStart = lastTrigger;
  autocompleteFilteredItems = filterMergeFields(query);
  autocompleteSelectedIndex = 0;

  if (autocompleteFilteredItems.length > 0) {
    renderAutocompleteDropdown(autocompleteFilteredItems, query);
    showAutocomplete(input);
  } else {
    hideAutocomplete();
  }
});

// Autocomplete: keyboard navigation (capture phase to intercept before global handler)
document.addEventListener('keydown', (e) => {
  if (!autocompleteVisible) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      e.stopPropagation();
      autocompleteSelectedIndex = (autocompleteSelectedIndex + 1) % autocompleteFilteredItems.length;
      updateAutocompleteSelection();
      break;

    case 'ArrowUp':
      e.preventDefault();
      e.stopPropagation();
      autocompleteSelectedIndex = (autocompleteSelectedIndex - 1 + autocompleteFilteredItems.length) % autocompleteFilteredItems.length;
      updateAutocompleteSelection();
      break;

    case 'Enter':
      e.preventDefault();
      e.stopPropagation();
      if (autocompleteSelectedIndex >= 0) {
        selectAutocompleteItem(autocompleteSelectedIndex);
      }
      break;

    case 'Escape':
      e.preventDefault();
      e.stopPropagation();
      hideAutocomplete();
      break;

    case 'Tab':
      hideAutocomplete();
      break;
  }
}, true);

// Autocomplete: close on outside click
document.addEventListener('mousedown', (e) => {
  if (!autocompleteVisible) return;
  if (!autocompleteDropdown) return;

  const target = e.target as HTMLElement;
  if (autocompleteDropdown.contains(target)) return;
  if (target === autocompleteTargetInput) return;

  hideAutocomplete();
});

// Autocomplete: close on blur (with delay to allow dropdown mousedown)
document.addEventListener('focusout', (e) => {
  if (!autocompleteVisible) return;
  const target = e.target as HTMLElement;
  if (target !== autocompleteTargetInput) return;

  setTimeout(() => {
    const activeEl = document.activeElement;
    if (activeEl !== autocompleteTargetInput) {
      hideAutocomplete();
    }
  }, 150);
});

// Autocomplete: reposition on scroll/resize
window.addEventListener('scroll', () => {
  if (autocompleteVisible && autocompleteTargetInput) {
    positionAutocomplete(autocompleteTargetInput);
  }
}, true);

window.addEventListener('resize', () => {
  if (autocompleteVisible && autocompleteTargetInput) {
    positionAutocomplete(autocompleteTargetInput);
  }
});

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
                subHeader.style.cssText = 'font-size: 9px; font-weight: 700; color: var(--label-tertiary); margin-top: var(--spacing-sm); margin-bottom: var(--spacing-xs); text-transform: uppercase; letter-spacing: 0.05em;';
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

// Right Panel: toggle, close, tab switching
const openRightPanel = () => {
  rightPanel?.classList.add('open');
  rightPanelOverlay?.classList.add('visible');
  if (window.innerWidth <= 1024) document.body.style.overflow = 'hidden';
};
const closeRightPanelFunc = () => {
  rightPanel?.classList.remove('open');
  rightPanelOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
};

floatingPanelBtn?.addEventListener('click', openRightPanel);
closeRightPanel?.addEventListener('click', closeRightPanelFunc);
rightPanelOverlay?.addEventListener('click', closeRightPanelFunc);

// Tab switching inside right panel
document.querySelectorAll('.right-panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');
    document.querySelectorAll('.right-panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.right-panel-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    const targetContent = document.getElementById(`right-panel-${targetTab}`);
    targetContent?.classList.add('active');
  });
});

// Add Component buttons in design sidebar
document.querySelectorAll('.sidebar-component-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const type = opt.getAttribute('data-type');
    if (type) {
      addNewComponent(type);
    }
  });
});

const getDefaultComponentData = (type: string): Record<string, string> => {
    switch (type) {
        case 'header':
            return {
                text: 'Your Header Title',
                fontSize: designSettings.globalFontSize || '18',
                textColor: designSettings.globalBodyColor || '#1d1d1f',
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                paddingTop: '15',
                paddingBottom: '15',
                paddingLeftRight: '15'
            };
        case 'text_block':
            return {
                text: 'This is a sample text block. You can use merge fields here.',
                fontSize: designSettings.globalFontSize || '12',
                textColor: designSettings.globalBodyColor || '#3c3c43',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'left',
                paddingTop: '8',
                paddingBottom: '8',
                paddingLeftRight: '15'
            };
        case 'image':
            return {
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
        case 'button':
            return {
                text: 'Click Here',
                link: 'https://example.com',
                fontSize: '12',
                textColor: '#ffffff',
                backgroundColor: designSettings.globalLinkColor || '#007aff',
                align: 'center',
                paddingTop: '9',
                paddingBottom: '9',
                paddingLeftRight: '15',
                widthType: 'auto'
            };
        case 'divider':
            return {
                width: '100',
                thickness: '1',
                lineColor: '#CCCCCC',
                alignment: 'center',
                paddingTop: '12',
                paddingBottom: '12',
                paddingLeftRight: '0'
            };
        case 'spacer':
            return {
                height: '30',
                backgroundColor: 'transparent',
                matchEmailBackground: 'true',
            };
        case 'disclaimers':
            return {
                text: '*Terms and conditions apply. See dealer for details.',
                fontSize: '9',
                textColor: '#86868b',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                paddingTop: '12',
                paddingBottom: '12',
                paddingLeftRight: '15'
            };
        case 'service_offer':
            return {
                layout: 'single',
                showImage: 'false', imageUrl: '', imageAlt: '', imageLink: '',
                serviceTitle: 'Oil Change Special', couponCode: 'OILCHANGE50',
                serviceDetails: 'Get $50 off your next oil change service. Includes up to 5 quarts of synthetic blend oil and filter replacement.',
                disclaimer: '*Valid at participating dealers only. Cannot be combined with other offers.',
                buttonText: 'Schedule Now', buttonLink: '',
                showImage2: 'false', imageUrl2: '', imageAlt2: '', imageLink2: '',
                serviceTitle2: 'Tire Rotation Deal', couponCode2: 'TIRES25',
                serviceDetails2: 'Get $25 off your next tire rotation. Keep your tires wearing evenly and extend their life.',
                disclaimer2: '*Valid at participating dealers only. Cannot be combined with other offers.',
                buttonText2: 'Book Service', buttonLink2: '',
                containerPaddingTop: '15', containerPaddingBottom: '15', containerPaddingLeft: '15', containerPaddingRight: '15',
                imageWidth: '100', imageAlignment: 'center', imagePaddingTop: '8', imagePaddingBottom: '8',
                titleFontSize: '18', titleFontWeight: 'bold', titleFontStyle: 'normal', titleTextColor: '#000000', titleBgColor: 'transparent', titleAlignment: 'center', titlePaddingTop: '8', titlePaddingBottom: '8', titlePaddingLeftRight: '0',
                couponFontSize: '15', couponFontWeight: 'bold', couponFontStyle: 'normal', couponTextColor: '#0066FF', couponBgColor: '#F0F7FF', couponAlignment: 'center', couponPaddingTop: '6', couponPaddingBottom: '6', couponPaddingLeftRight: '12', couponShowBorder: 'false', couponBorderStyle: 'dashed', couponBorderColor: '#0066FF',
                detailsFontSize: '12', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsTextColor: '#333333', detailsBgColor: 'transparent', detailsAlignment: 'center', detailsLineHeight: '1.5', detailsPaddingTop: '9', detailsPaddingBottom: '9', detailsPaddingLeftRight: '0',
                disclaimerFontSize: '9', disclaimerFontWeight: 'normal', disclaimerFontStyle: 'normal', disclaimerTextColor: '#666666', disclaimerBgColor: 'transparent', disclaimerAlignment: 'center', disclaimerPaddingTop: '6', disclaimerPaddingBottom: '6', disclaimerPaddingLeftRight: '0',
                buttonFontSize: '12', buttonAlignment: 'center', buttonBgColor: '#0066FF', buttonTextColor: '#FFFFFF', buttonPaddingTop: '9', buttonPaddingBottom: '9', buttonPaddingLeftRight: '15', buttonWidth: 'auto',
                imageWidth2: '100', imageAlignment2: 'center', imagePaddingTop2: '8', imagePaddingBottom2: '8',
                titleFontSize2: '18', titleFontWeight2: 'bold', titleFontStyle2: 'normal', titleTextColor2: '#000000', titleBgColor2: 'transparent', titleAlignment2: 'center', titlePaddingTop2: '8', titlePaddingBottom2: '8', titlePaddingLeftRight2: '0',
                couponFontSize2: '15', couponFontWeight2: 'bold', couponFontStyle2: 'normal', couponTextColor2: '#0066FF', couponBgColor2: '#F0F7FF', couponAlignment2: 'center', couponPaddingTop2: '6', couponPaddingBottom2: '6', couponPaddingLeftRight2: '12', couponShowBorder2: 'false', couponBorderStyle2: 'dashed', couponBorderColor2: '#0066FF',
                detailsFontSize2: '12', detailsFontWeight2: 'normal', detailsFontStyle2: 'normal', detailsTextColor2: '#333333', detailsBgColor2: 'transparent', detailsAlignment2: 'center', detailsLineHeight2: '1.5', detailsPaddingTop2: '9', detailsPaddingBottom2: '9', detailsPaddingLeftRight2: '0',
                disclaimerFontSize2: '9', disclaimerFontWeight2: 'normal', disclaimerFontStyle2: 'normal', disclaimerTextColor2: '#666666', disclaimerBgColor2: 'transparent', disclaimerAlignment2: 'center', disclaimerPaddingTop2: '6', disclaimerPaddingBottom2: '6', disclaimerPaddingLeftRight2: '0',
                buttonFontSize2: '12', buttonAlignment2: 'center', buttonBgColor2: '#0066FF', buttonTextColor2: '#FFFFFF', buttonPaddingTop2: '9', buttonPaddingBottom2: '9', buttonPaddingLeftRight2: '15', buttonWidth2: 'auto',
                textLayout: 'center'
            };
        case 'sales_offer':
            return {
                layout: 'center',
                imageEnabled: 'true', imageSrc: 'https://via.placeholder.com/600x300', imageAlt: 'New Sales Offer', imageLink: '', imageWidth: '100%',
                vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}',
                mainOfferText: '$2,500 Trade-In Bonus',
                detailsText: 'Upgrade your current ride today with our exclusive seasonal offer.',
                stockVinType: 'stock', stockVinValue: '{{customer.last_transaction.vehicle.vin}}',
                mileageValue: '{{customer.last_transaction.vehicle.mileage}}',
                disclaimerText: '*Terms and conditions apply. Offer valid through end of month.',
                additionalOffers: '[]', btnText: 'View Details', btnLink: '{{dealership.tracked_website_homepage_url}}',
                imageEnabled2: 'true', imageSrc2: 'https://via.placeholder.com/600x300', imageAlt2: 'Used Sales Offer', imageLink2: '', imageWidth2: '100%',
                vehicleText2: 'Pre-Owned Vehicle Special', mainOfferText2: 'Low APR Financing',
                detailsText2: 'Get behind the wheel of a quality pre-owned vehicle with great financing options.',
                stockVinType2: 'stock', stockVinValue2: '', mileageValue2: '',
                disclaimerText2: '*With approved credit. See dealer for details.',
                additionalOffers2: '[]', btnText2: 'View Inventory', btnLink2: '{{dealership.tracked_website_specials_url}}',
                vehicleFontSize: '18', vehicleFontWeight: 'normal', vehicleFontStyle: 'normal', vehicleColor: '#1d1d1f', vehicleBgColor: 'transparent', vehicleTextAlign: 'center', vehiclePaddingTop: '0', vehiclePaddingBottom: '6', vehiclePaddingLeftRight: '0',
                mainOfferFontSize: '21', mainOfferFontWeight: 'normal', mainOfferFontStyle: 'normal', mainOfferColor: '#007aff', mainOfferBgColor: 'transparent', mainOfferTextAlign: 'center', mainOfferPaddingTop: '0', mainOfferPaddingBottom: '6', mainOfferPaddingLeftRight: '0',
                detailsFontSize: '12', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsColor: '#6e6e73', detailsBgColor: 'transparent', detailsTextAlign: 'center', detailsPaddingTop: '0', detailsPaddingBottom: '9', detailsPaddingLeftRight: '0',
                stockVinFontSize: '12', stockVinFontWeight: 'normal', stockVinFontStyle: 'normal', stockVinColor: '#86868b', stockVinBgColor: 'transparent', stockVinTextAlign: 'center', stockVinPaddingTop: '8', stockVinPaddingBottom: '0', stockVinPaddingLeftRight: '0',
                mileageFontSize: '12', mileageFontWeight: 'normal', mileageFontStyle: 'normal', mileageColor: '#86868b', mileageBgColor: 'transparent', mileageTextAlign: 'center', mileagePaddingTop: '3', mileagePaddingBottom: '0', mileagePaddingLeftRight: '0',
                disclaimerFontSize: '9', disclaimerFontWeight: 'normal', disclaimerFontStyle: 'normal', disclaimerColor: '#86868b', disclaimerBgColor: 'transparent', disclaimerTextAlign: 'center', disclaimerPaddingTop: '12', disclaimerPaddingBottom: '0', disclaimerPaddingLeftRight: '0',
                btnFontSize: '12', btnPaddingTop: '9', btnPaddingBottom: '9', btnPaddingLeftRight: '15', btnColor: '#007aff', btnTextColor: '#ffffff', btnAlign: 'center', btnWidthType: 'full',
                vehicleFontSize2: '18', vehicleFontWeight2: 'normal', vehicleFontStyle2: 'normal', vehicleColor2: '#1d1d1f', vehicleBgColor2: 'transparent', vehicleTextAlign2: 'center', vehiclePaddingTop2: '0', vehiclePaddingBottom2: '6', vehiclePaddingLeftRight2: '0',
                mainOfferFontSize2: '21', mainOfferFontWeight2: 'normal', mainOfferFontStyle2: 'normal', mainOfferColor2: '#007aff', mainOfferBgColor2: 'transparent', mainOfferTextAlign2: 'center', mainOfferPaddingTop2: '0', mainOfferPaddingBottom2: '6', mainOfferPaddingLeftRight2: '0',
                detailsFontSize2: '12', detailsFontWeight2: 'normal', detailsFontStyle2: 'normal', detailsColor2: '#6e6e73', detailsBgColor2: 'transparent', detailsTextAlign2: 'center', detailsPaddingTop2: '0', detailsPaddingBottom2: '9', detailsPaddingLeftRight2: '0',
                stockVinFontSize2: '12', stockVinFontWeight2: 'normal', stockVinFontStyle2: 'normal', stockVinColor2: '#86868b', stockVinBgColor2: 'transparent', stockVinTextAlign2: 'center', stockVinPaddingTop2: '8', stockVinPaddingBottom2: '0', stockVinPaddingLeftRight2: '0',
                mileageFontSize2: '12', mileageFontWeight2: 'normal', mileageFontStyle2: 'normal', mileageColor2: '#86868b', mileageBgColor2: 'transparent', mileageTextAlign2: 'center', mileagePaddingTop2: '3', mileagePaddingBottom2: '0', mileagePaddingLeftRight2: '0',
                disclaimerFontSize2: '9', disclaimerFontWeight2: 'normal', disclaimerFontStyle2: 'normal', disclaimerColor2: '#86868b', disclaimerBgColor2: 'transparent', disclaimerTextAlign2: 'center', disclaimerPaddingTop2: '12', disclaimerPaddingBottom2: '0', disclaimerPaddingLeftRight2: '0',
                btnFontSize2: '12', btnPaddingTop2: '9', btnPaddingBottom2: '9', btnPaddingLeftRight2: '15', btnColor2: '#007aff', btnTextColor2: '#ffffff', btnAlign2: 'center', btnWidthType2: 'full',
                paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15', backgroundColor: '#ffffff',
                textLayout: 'center'
            };
        case 'footer':
            return {
                layout: 'inline',
                links: JSON.stringify([
                    { text: 'Privacy Policy', url: '{{dealership.tracked_website_homepage_url}}' },
                    { text: 'Unsubscribe', url: '{{unsubscribe_url}}' },
                    { text: 'Contact Us', url: '{{dealership.tracked_website_homepage_url}}' },
                ]),
                fontSize: '12',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                textColor: designSettings.globalLinkColor || '#007aff',
                backgroundColor: 'transparent',
                separatorColor: '#c7c7cc',
                separatorStyle: 'dot',
                paddingTop: '15',
                paddingBottom: '15',
                paddingLeftRight: '15',
                linkSpacing: '12',
            };
        default:
            return {};
    }
};

const resetComponentStyles = (id: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (!comp) return;

    const defaults = getDefaultComponentData(comp.type);
    const contentKeys = CONTENT_KEYS[comp.type] || [];

    for (const key of Object.keys(comp.data)) {
        if (contentKeys.includes(key)) continue;
        if (STRUCTURAL_KEYS.includes(key)) continue;
        if (key in defaults) {
            comp.data[key] = defaults[key];
        }
    }

    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Styles reset to defaults', 'success');
};

const clearComponentContent = (id: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (!comp) return;

    const contentKeys = CONTENT_KEYS[comp.type] || [];
    if (contentKeys.length === 0) return;

    for (const key of contentKeys) {
        if (!(key in comp.data)) continue;

        if (key === 'additionalOffers' || key === 'additionalOffers2' || key === 'links') {
            comp.data[key] = '[]';
        } else if (key === 'showImage' || key === 'showImage2' || key === 'imageEnabled' || key === 'imageEnabled2') {
            comp.data[key] = 'false';
        } else if (key === 'stockVinType' || key === 'stockVinType2') {
            comp.data[key] = 'stock';
        } else {
            comp.data[key] = '';
        }
    }

    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Content cleared', 'success');
};

const addNewComponent = (type: string) => {
    const id = Date.now().toString();
    const data = getDefaultComponentData(type);

    activeComponents.push({ id, type, data });
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`${type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1)} added`, 'success');

    setTimeout(() => {
        const newElement = document.querySelector(`.component-item[data-id='${id}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newElement.classList.add('highlight-pulse');
            setTimeout(() => newElement.classList.remove('highlight-pulse'), 1000);
        }
    }, 100);
};

const removeComponent = (id: string) => {
    const removedIndex = activeComponents.findIndex(c => c.id === id);
    const removedComponent = removedIndex !== -1 ? JSON.parse(JSON.stringify(activeComponents[removedIndex])) as EmailComponent : null;

    activeComponents = activeComponents.filter(c => c.id !== id);
    if (selectedComponentId === id) {
        selectedComponentId = null;
    }
    delete collapsedStates[id];
    saveCollapsedStates();
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast('Section removed', 'success', removedComponent ? () => {
        activeComponents.splice(removedIndex, 0, removedComponent);
        saveToHistory();
        renderComponents();
        saveDraft();
    } : undefined);
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
            newElement.classList.add('highlight-pulse');
            setTimeout(() => newElement.classList.remove('highlight-pulse'), 1000);
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
        <div class="offer-img-row">
            <div class="offer-img-toggle">
                <label class="form-label">Image</label>
                <div class="toggle-switch-group">
                    <div class="toggle-switch compact">
                        <input type="checkbox" id="show-image-${comp.id}-${suffix || '1'}" class="toggle-switch-checkbox" data-key="showImage${suffix}" ${isChecked ? 'checked' : ''}>
                        <label for="show-image-${comp.id}-${suffix || '1'}" class="toggle-switch-label"></label>
                    </div>
                    <label for="show-image-${comp.id}-${suffix || '1'}" class="toggle-switch-text-label">Show</label>
                </div>
            </div>
            <div id="service-image-fields-${comp.id}-${suffix || '1'}" class="offer-img-fields" style="display: ${displayStyle};">
                <div class="img-field-group">
                    <label class="form-label">URL</label>
                    <div class="img-url-inner">
                        <input type="text" class="form-control compact" data-key="imageUrl${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferImage${suffix}" data-field-label="Image ${suffix || '1'}" value="${d[`imageUrl${suffix}`] || ''}" placeholder="https://...">
                        <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                        <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="${suffix || '1'}">
                    </div>
                </div>
                <div class="img-field-group">
                    <label class="form-label">Alt</label>
                    <input type="text" class="form-control compact" data-key="imageAlt${suffix}" value="${d[`imageAlt${suffix}`] || ''}" placeholder="Description">
                </div>
                <div class="img-field-group">
                    <label class="form-label">Link</label>
                    <input type="text" class="form-control compact" data-key="imageLink${suffix}" value="${d[`imageLink${suffix}`] || ''}" placeholder="https://...">
                </div>
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
        <div class="component-row">
            <div class="component-row-item">
                <label class="form-label">Btn Text</label>
                <input type="text" class="form-control compact" data-key="buttonText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton${suffix}" data-field-label="Button ${suffix || '1'} Text" value="${d[`buttonText${suffix}`] || ''}" placeholder="e.g. Schedule Now">
            </div>
            <div class="component-row-item">
                <label class="form-label">Btn Link</label>
                <input type="text" class="form-control compact" data-key="buttonLink${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="serviceOfferButton${suffix}" data-field-label="Button ${suffix || '1'} Link" value="${d[`buttonLink${suffix}`] || ''}" placeholder="https://...">
            </div>
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
        <div class="sub-offer-item" data-index="${index}">
            <div class="sub-offer-header">
                <span class="sub-offer-label">Additional Offer ${index + 1}</span>
                <button type="button" class="btn btn-ghost btn-sm remove-sub-offer" data-index="${index}" data-offer-index="${suffix || '1'}" data-tooltip="Remove">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
            <div class="sub-offer-body">
                <div class="form-group">
                    <label class="form-label">Separator Text</label>
                    <input type="text" class="form-control compact sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="separator" value="${offer.separator || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="separator${suffix}" data-sub-offer-index="${index}" data-field-label="Separator">
                </div>
                <div class="form-group">
                    <label class="form-label">Offer Title</label>
                    <input type="text" class="form-control compact sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="offer" value="${offer.offer || ''}" data-stylable="true" data-component-id="${comp.id}" data-field-key="offer${suffix}" data-sub-offer-index="${index}" data-field-label="Offer Title">
                </div>
                <div class="form-group">
                    <label class="form-label">Details</label>
                    <textarea class="form-control compact sub-offer-field" data-index="${index}" data-offer-index="${suffix || '1'}" data-field="details" data-stylable="true" data-component-id="${comp.id}" data-field-key="details${suffix}" data-sub-offer-index="${index}" data-field-label="Offer Details">${offer.details || ''}</textarea>
                </div>
            </div>
        </div>
    `).join('');

    html += `
        <button type="button" class="add-sub-offer-btn" data-offer-index="${suffix || '1'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Additional Offer
        </button>
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
            <div class="offer-img-row">
                <div class="offer-img-toggle">
                    <label class="form-label">Image</label>
                    <div class="toggle-switch-group">
                        <div class="toggle-switch compact">
                            <input type="checkbox" id="image-enabled-${comp.id}-${suffix || '1'}" class="toggle-switch-checkbox" data-key="imageEnabled${suffix}" ${isChecked ? 'checked' : ''}>
                            <label for="image-enabled-${comp.id}-${suffix || '1'}" class="toggle-switch-label"></label>
                        </div>
                        <label for="image-enabled-${comp.id}-${suffix || '1'}" class="toggle-switch-text-label">Show</label>
                    </div>
                </div>
                <div id="image-fields-container-${comp.id}-${suffix || '1'}" class="offer-img-fields" style="display: ${displayStyle};">
                    <div class="img-field-group">
                        <label class="form-label">URL</label>
                        <div class="img-url-inner">
                            <input type="text" class="form-control compact" data-key="imageSrc${suffix}" value="${d[`imageSrc${suffix}`] || ''}" placeholder="https://...">
                            <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                            <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="${suffix || '1'}">
                        </div>
                    </div>
                    <div class="img-field-group">
                        <label class="form-label">Alt</label>
                        <input type="text" class="form-control compact" data-key="imageAlt${suffix}" value="${d[`imageAlt${suffix}`] || ''}" placeholder="Description">
                    </div>
                    <div class="img-field-group">
                        <label class="form-label">Link</label>
                        <input type="text" class="form-control compact" data-key="imageLink${suffix}" value="${d[`imageLink${suffix}`] || ''}" placeholder="https://...">
                    </div>
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
        <div class="component-row">
            <div class="component-row-item">
                <label class="form-label">Btn Text</label>
                <input type="text" class="form-control compact" data-key="btnText${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton${suffix}" data-field-label="Button Text" value="${d[`btnText${suffix}`] || ''}" placeholder="e.g. View Offer">
            </div>
            <div class="component-row-item">
                <label class="form-label">Btn Link</label>
                <input type="text" class="form-control compact" data-key="btnLink${suffix}" data-stylable="true" data-component-id="${comp.id}" data-field-key="salesOfferButton${suffix}" data-field-label="Button Link" value="${d[`btnLink${suffix}`] || ''}" placeholder="https://...">
            </div>
        </div>
    `;

    return html;
}
// --- END: Fix for missing functions

const COMPONENT_TYPE_ICONS: Record<string, string> = {
    header: 'format_h1',
    text_block: 'format_align_justify',
    image: 'image',
    button: 'radio_button_checked',
    divider: 'horizontal_rule',
    spacer: 'expand_all',
    service_offer: 'handyman',
    sales_offer: 'sell',
    disclaimers: 'contract',
    footer: 'link',
};

const getComponentTypeIcon = (type: string): string => COMPONENT_TYPE_ICONS[type] || 'widgets';

const formatComponentTypeName = (type: string): string =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const renderComponents = () => {
    componentsContainer.innerHTML = '';
    if (activeComponents.length === 0) {
        componentsContainer.innerHTML = `
            <div id="empty-state-message" style="text-align: center; padding: var(--spacing-2xl) var(--spacing-lg); border: 2px dashed var(--separator-primary); border-radius: var(--radius-lg); color: var(--label-secondary);">
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
        const TRUNCATE_LENGTH = 34;

        switch (comp.type) {
            case 'header':
            case 'text_block':
            case 'disclaimers':
                sourceFieldKey = 'text';
                break;
            case 'image':
                sourceFieldKey = 'alt';
                break;
            case 'button':
                sourceFieldKey = 'text';
                break;
            case 'footer':
                sourceFieldKey = null;
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
        } else if (comp.type === 'disclaimers') {
            componentFormHtml = `
                <div class="form-group">
                    <label class="form-label">Disclaimer Text</label>
                    <textarea class="form-control" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="disclaimers" data-field-label="Disclaimer Text">${comp.data.text || ''}</textarea>
                </div>
            `;
        } else if (comp.type === 'image') {
            componentFormHtml = `
                <div class="img-fields-row">
                    <div class="img-field-group">
                        <label class="form-label">URL</label>
                        <div class="img-url-inner">
                            <input type="text" class="form-control compact" data-key="src" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Source" value="${comp.data.src || ''}" placeholder="https://example.com/image.jpg">
                            <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                            <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp">
                        </div>
                    </div>
                    <div class="img-field-group">
                        <label class="form-label">Alt</label>
                        <input type="text" class="form-control compact" data-key="alt" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Alt Text" value="${comp.data.alt || ''}" placeholder="Image description">
                    </div>
                    <div class="img-field-group">
                        <label class="form-label">Link</label>
                        <input type="text" class="form-control compact" data-key="link" data-stylable="true" data-component-id="${comp.id}" data-field-key="image" data-field-label="Image Link" value="${comp.data.link || ''}" placeholder="https://example.com">
                    </div>
                </div>
            `;
        } else if (comp.type === 'button') {
            componentFormHtml = `
                <div class="component-row">
                    <div class="component-row-item">
                        <label class="form-label">Btn Text</label>
                        <input type="text" class="form-control compact" data-key="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="button" data-field-label="Button Text" value="${comp.data.text || ''}" placeholder="e.g. Shop Now">
                    </div>
                    <div class="component-row-item">
                        <label class="form-label">Btn Link</label>
                        <input type="text" class="form-control compact" data-key="link" data-stylable="true" data-component-id="${comp.id}" data-field-key="button" data-field-label="Button Link" value="${comp.data.link || ''}" placeholder="https://example.com">
                    </div>
                </div>
            `;
        } else if (comp.type === 'footer') {
            let footerLinks: {text: string; url: string}[] = [];
            try { footerLinks = JSON.parse(comp.data.links || '[]'); } catch { footerLinks = []; }

            const layoutToggle = `
                <div class="component-row" style="margin-bottom: 8px;">
                    <div class="component-row-item" style="flex: 1;">
                        <label class="form-label">Layout</label>
                        <div class="footer-layout-toggle">
                            <button type="button" class="footer-layout-btn ${comp.data.layout === 'inline' ? 'active' : ''}" data-key="layout" data-value="inline" title="Side by Side">
                                <span class="material-symbols-rounded" style="font-size: 16px;">view_column</span> Inline
                            </button>
                            <button type="button" class="footer-layout-btn ${comp.data.layout === 'stacked' ? 'active' : ''}" data-key="layout" data-value="stacked" title="Stacked">
                                <span class="material-symbols-rounded" style="font-size: 16px;">view_agenda</span> Stacked
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const separatorLabel = comp.data.separatorStyle === 'pipe' ? '|' : comp.data.separatorStyle === 'dash' ? '—' : '·';
            const linksHtml = footerLinks.map((link, i) => `
                <div class="footer-link-item" data-link-index="${i}">
                    <div class="footer-link-fields">
                        <div class="component-row">
                            <div class="component-row-item">
                                <label class="form-label">Text</label>
                                <input type="text" class="form-control compact footer-link-field" data-link-index="${i}" data-link-field="text" data-stylable="true" data-component-id="${comp.id}" data-field-key="footerLinks" data-field-label="Link Text" value="${link.text || ''}" placeholder="Link text">
                            </div>
                            <div class="component-row-item">
                                <label class="form-label">URL</label>
                                <input type="text" class="form-control compact footer-link-field" data-link-index="${i}" data-link-field="url" value="${link.url || ''}" placeholder="https://...">
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm remove-footer-link" data-link-index="${i}" data-tooltip="Remove" style="color: var(--destructive); flex-shrink: 0; padding: 2px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
                    </button>
                </div>
            `).join('');

            const separatorPreview = comp.data.layout === 'inline' ? `
                <div class="footer-separator-preview" data-stylable="true" data-component-id="${comp.id}" data-field-key="footerSeparator" data-field-label="Separator" tabindex="0">
                    <span class="footer-separator-sample" style="color: ${comp.data.separatorColor || '#c7c7cc'}; font-size: ${comp.data.fontSize || 12}px;">
                        Link ${separatorLabel} Link ${separatorLabel} Link
                    </span>
                </div>
            ` : '';

            const containerPreview = `
                <div class="footer-container-preview" data-stylable="true" data-component-id="${comp.id}" data-field-key="footerContainer" data-field-label="Container" tabindex="0">
                    <span class="material-symbols-rounded" style="font-size: 14px; color: var(--label-tertiary);">settings</span>
                    <span style="font-size: 11px; color: var(--label-secondary);">Container &amp; Alignment</span>
                </div>
            `;

            componentFormHtml = `
                ${layoutToggle}
                <div class="footer-links-list">${linksHtml}</div>
                <button type="button" class="add-footer-link-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Footer Link
                </button>
                ${separatorPreview}
                ${containerPreview}
            `;
        } else if (comp.type === 'divider') {
            componentFormHtml = `
                <div class="divider-preview-container" tabindex="0" data-alignment="${comp.data.alignment}" style="padding: ${comp.data.paddingTop}px 15px ${comp.data.paddingBottom}px 15px;" data-stylable="true" data-component-id="${comp.id}" data-field-key="divider" data-field-label="Divider">
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
                ${!isGrid ? `
                <div class="single-offer-settings">
                  <div class="offer-img-row">
                      <div class="offer-img-toggle">
                          <label class="form-label">Image</label>
                          <div class="toggle-switch-group">
                              <div class="toggle-switch compact">
                                  <input type="checkbox" id="image-enabled-${comp.id}" class="toggle-switch-checkbox" data-key="imageEnabled" ${comp.data.imageEnabled === 'true' ? 'checked' : ''}>
                                  <label for="image-enabled-${comp.id}" class="toggle-switch-label"></label>
                              </div>
                              <label for="image-enabled-${comp.id}" class="toggle-switch-text-label">Show</label>
                          </div>
                      </div>
                      <div id="image-fields-container-${comp.id}-1" class="offer-img-fields" style="display: ${comp.data.imageEnabled === 'true' ? 'flex' : 'none'};">
                          <div class="img-field-group">
                              <label class="form-label">URL</label>
                              <div class="img-url-inner">
                                  <input type="text" class="form-control compact" data-key="imageSrc" value="${comp.data.imageSrc || ''}" placeholder="https://...">
                                  <button type="button" class="btn btn-secondary btn-sm upload-btn">Upload</button>
                                  <input type="file" class="hidden file-input" accept="image/jpeg,image/png,image/gif,image/webp" data-offer-index="1">
                              </div>
                          </div>
                          <div class="img-field-group">
                              <label class="form-label">Alt</label>
                              <input type="text" class="form-control compact" data-key="imageAlt" value="${comp.data.imageAlt || ''}" placeholder="Description">
                          </div>
                          <div class="img-field-group">
                              <label class="form-label">Link</label>
                              <input type="text" class="form-control compact" data-key="imageLink" value="${comp.data.imageLink || ''}" placeholder="https://...">
                          </div>
                      </div>
                  </div>
                </div>
                ` : ''}

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

        const typeIcon = getComponentTypeIcon(comp.type);

        const currentTextLayout = comp.data.textLayout || 'center';
        let offerHeaderControls = '';
        if (comp.type === 'sales_offer') {
            const isSLeft = comp.data.layout === 'left';
            const isSCenter = comp.data.layout === 'center' || !comp.data.layout;
            const isSRight = comp.data.layout === 'right';
            const isSGrid = comp.data.layout === 'grid';
            offerHeaderControls = `
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn layout-toggle ${isSLeft ? 'active' : ''}" data-key="layout" data-value="left" data-tooltip="Image Left"><span class="material-symbols-rounded">splitscreen_left</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSCenter ? 'active' : ''}" data-key="layout" data-value="center" data-tooltip="Center"><span class="material-symbols-rounded">splitscreen_top</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSRight ? 'active' : ''}" data-key="layout" data-value="right" data-tooltip="Image Right"><span class="material-symbols-rounded">splitscreen_right</span></button>
                    <button type="button" class="toggle-btn layout-toggle ${isSGrid ? 'active' : ''}" data-key="layout" data-value="grid" data-tooltip="Grid"><span class="material-symbols-rounded">splitscreen_add</span></button>
                </div>
                <span class="header-toggle-divider"></span>
            `;
        } else if (comp.type === 'service_offer') {
            const isSvcGrid = comp.data.layout === 'grid';
            offerHeaderControls = `
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn layout-toggle ${!isSvcGrid ? 'active' : ''}" data-key="layout" data-value="single" title="Single Column">1</button>
                    <button type="button" class="toggle-btn layout-toggle ${isSvcGrid ? 'active' : ''}" data-key="layout" data-value="grid" title="Two Columns">2×2</button>
                </div>
                <span class="header-toggle-divider"></span>
            `;
        }
        if (comp.type === 'sales_offer' || comp.type === 'service_offer') {
            offerHeaderControls += `
                <div class="toggle-group header-toggle-group">
                    <button type="button" class="toggle-btn text-layout-toggle ${currentTextLayout === 'left' ? 'active' : ''}" data-key="textLayout" data-value="left" data-tooltip="Align Left"><span class="material-symbols-rounded">format_align_left</span></button>
                    <button type="button" class="toggle-btn text-layout-toggle ${currentTextLayout === 'center' ? 'active' : ''}" data-key="textLayout" data-value="center" data-tooltip="Align Center"><span class="material-symbols-rounded">format_align_center</span></button>
                    <button type="button" class="toggle-btn text-layout-toggle ${currentTextLayout === 'right' ? 'active' : ''}" data-key="textLayout" data-value="right" data-tooltip="Align Right"><span class="material-symbols-rounded">format_align_right</span></button>
                </div>
                <span class="header-toggle-divider"></span>
            `;
        }

        item.innerHTML = `
            <div class="card-header">
                <span class="drag-handle" data-tooltip="Drag to reorder">
                    <svg width="9" height="12" viewBox="0 0 12 16" fill="currentColor">
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
                    <span class="material-symbols-rounded component-type-icon">${typeIcon}</span>
                    <span id="component-title-${comp.id}" class="component-title text-xs font-bold uppercase" style="color: var(--label-secondary);">${index + 1} - ${dynamicTitle}</span>
                </div>
                <div class="flex items-center" style="gap: 3px;">
                    ${offerHeaderControls}
                    <button type="button" class="btn btn-ghost btn-sm save-to-library-btn" data-tooltip="Save to Library">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm reset-comp-btn" data-tooltip="Reset Styles">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm clear-comp-btn" data-tooltip="Clear Content">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm duplicate-comp-btn" data-tooltip="Duplicate">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm remove-comp-btn" data-tooltip="Delete">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
                        separator: 'AND', separatorFontSize: '18', separatorFontWeight: 'normal', separatorFontStyle: 'normal', separatorColor: '#86868b', separatorBgColor: 'transparent', separatorTextAlign: 'center', separatorPaddingTop: '9', separatorPaddingBottom: '9', separatorPaddingLeftRight: '0',
                        offer: 'Additional Offer Title', offerFontSize: '21', offerFontWeight: 'normal', offerFontStyle: 'normal', offerColor: comp.data.mainOfferColor || '#007aff', offerBgColor: 'transparent', offerTextAlign: 'center', offerPaddingTop: '0', offerPaddingBottom: '3', offerPaddingLeftRight: '0',
                        details: 'Details for the additional offer.', detailsFontSize: '12', detailsFontWeight: 'normal', detailsFontStyle: 'normal', detailsColor: comp.data.detailsColor || '#6e6e73', detailsBgColor: 'transparent', detailsTextAlign: 'center', detailsPaddingTop: '0', detailsPaddingBottom: '3', detailsPaddingLeftRight: '0',
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

        if (comp.type === 'footer') {
            // Layout toggle
            item.querySelectorAll('.footer-layout-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = (btn as HTMLElement).dataset.value || 'inline';
                    updateComponentData(comp.id, 'layout', value);
                    renderComponents();
                });
            });

            // Add footer link
            item.querySelectorAll('.add-footer-link-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const current = JSON.parse(comp.data.links || '[]');
                    current.push({ text: 'New Link', url: '' });
                    updateComponentData(comp.id, 'links', JSON.stringify(current));
                    renderComponents();
                });
            });

            // Remove footer link
            item.querySelectorAll('.remove-footer-link').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-link-index') || '0');
                    const current = JSON.parse(comp.data.links || '[]');
                    current.splice(idx, 1);
                    updateComponentData(comp.id, 'links', JSON.stringify(current));
                    renderComponents();
                });
            });

            // Edit footer link fields
            item.querySelectorAll('.footer-link-field').forEach(input => {
                input.addEventListener('input', (e: any) => {
                    const target = e.target;
                    const idx = parseInt(target.getAttribute('data-link-index') || '0');
                    const field = target.getAttribute('data-link-field');
                    if (!field) return;
                    const current = JSON.parse(comp.data.links || '[]');
                    if (current[idx]) {
                        current[idx][field] = target.value;
                        updateComponentData(comp.id, 'links', JSON.stringify(current));
                    }
                });
            });
        }

        item.querySelectorAll('input, textarea, select, button.layout-toggle, button.text-layout-toggle').forEach(input => {
            if (!input.classList.contains('sub-offer-field') && !input.classList.contains('footer-link-field')) {
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

                        if (key === 'textLayout') {
                            // Update active state of text-layout buttons without full re-render
                            item.querySelectorAll('.text-layout-toggle').forEach(btn => {
                                btn.classList.toggle('active', btn.getAttribute('data-value') === value);
                            });
                        }

                        if (comp.type === 'sales_offer' && key === 'textLayout') {
                            ['', '2'].forEach(sfx => {
                                ['vehicleTextAlign', 'mainOfferTextAlign', 'detailsTextAlign',
                                 'stockVinTextAlign', 'mileageTextAlign', 'disclaimerTextAlign'].forEach(field => {
                                    updateComponentData(comp.id, `${field}${sfx}`, value);
                                });
                                updateComponentData(comp.id, `btnAlign${sfx}`, value);
                                try {
                                    const offerKey = `additionalOffers${sfx}`;
                                    const offers = JSON.parse(comp.data[offerKey] || '[]');
                                    updateComponentData(comp.id, offerKey, JSON.stringify(
                                        offers.map((o: any) => ({ ...o,
                                            separatorTextAlign: value, offerTextAlign: value,
                                            detailsTextAlign: value, disclaimerTextAlign: value }))
                                    ));
                                } catch {}
                            });
                            renderStylingPanel();
                        }

                        if (comp.type === 'service_offer' && key === 'textLayout') {
                            ['', '2'].forEach(sfx => {
                                ['titleAlignment', 'couponAlignment', 'detailsAlignment',
                                 'disclaimerAlignment', 'buttonAlignment'].forEach(field => {
                                    updateComponentData(comp.id, `${field}${sfx}`, value);
                                });
                            });
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

        item.querySelector('.reset-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            resetComponentStyles(comp.id);
        });

        item.querySelector('.clear-comp-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            clearComponentContent(comp.id);
        });

        item.querySelector('.save-to-library-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            saveComponentToLibrary(comp.id);
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
    updateCollapseAllBtn();
};

function initializeDragAndDrop() {
    const components = componentsContainer.querySelectorAll('.component-item');

    const dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';

    let dropBeforeId: string | null = null; // null → append to end

    const removeIndicator = () => {
        dropIndicator.parentNode?.removeChild(dropIndicator);
    };

    components.forEach(comp => {
        comp.addEventListener('dragstart', () => {
            draggedComponentId = comp.getAttribute('data-id');
            setTimeout(() => comp.classList.add('dragging'), 0);
        });

        comp.addEventListener('dragend', () => {
            comp.classList.remove('dragging');
            draggedComponentId = null;
            dropBeforeId = null;
            removeIndicator();
        });

        comp.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLElement;
            if (target.getAttribute('data-id') === draggedComponentId) return;

            const rect = target.getBoundingClientRect();
            if ((e as DragEvent).clientY < rect.top + rect.height / 2) {
                dropBeforeId = target.getAttribute('data-id');
                componentsContainer.insertBefore(dropIndicator, target);
            } else {
                const next = target.nextElementSibling;
                dropBeforeId = (next?.classList.contains('component-item'))
                    ? next.getAttribute('data-id')
                    : null;
                componentsContainer.insertBefore(dropIndicator, next ?? null);
            }
        });

        comp.addEventListener('drop', (e) => {
            e.preventDefault();
            removeIndicator();
            if (!draggedComponentId) return;

            const draggedIndex = activeComponents.findIndex(c => c.id === draggedComponentId);
            if (draggedIndex === -1) return;

            const [draggedItem] = activeComponents.splice(draggedIndex, 1);
            if (dropBeforeId === null) {
                activeComponents.push(draggedItem);
            } else {
                const targetIndex = activeComponents.findIndex(c => c.id === dropBeforeId);
                activeComponents.splice(targetIndex > -1 ? targetIndex : activeComponents.length, 0, draggedItem);
            }

            saveToHistory();
            saveDraft();
            renderComponents();
            showToast('Component moved', 'success');
        });
    });

    // Hide indicator if cursor leaves the container entirely
    componentsContainer.addEventListener('dragleave', (e) => {
        if (!componentsContainer.contains(e.relatedTarget as Node)) {
            removeIndicator();
            dropBeforeId = null;
        }
    });
}

function generateEmailHtml(): string {
  let sectionsHtml = '';
  
  activeComponents.forEach(comp => {
    const d = comp.data || {};
    const isTransparent = d.backgroundColor === 'transparent';
    
    if (comp.type === 'header' || comp.type === 'text_block' || comp.type === 'disclaimers') {
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
    } else if (comp.type === 'footer') {
        let footerLinks: {text: string; url: string}[] = [];
        try { footerLinks = JSON.parse(d.links || '[]'); } catch { footerLinks = []; }
        const isStacked = d.layout === 'stacked';
        const linkColor = d.textColor || '#007aff';
        const separatorColor = d.separatorColor || '#c7c7cc';
        const fontSize = d.fontSize || '12';
        const fontWeight = d.fontWeight || 'normal';
        const fontStyleVal = d.fontStyle || 'normal';
        const textDecor = d.textDecoration || 'none';
        const textAlign = d.textAlign || 'center';
        const spacing = parseInt(d.linkSpacing || '12');
        const bgColor = d.backgroundColor || 'transparent';
        const isTransparentBg = bgColor === 'transparent';
        const sepChar = d.separatorStyle === 'pipe' ? '|' : d.separatorStyle === 'dash' ? '&mdash;' : '&middot;';

        const linkStyle = [
            `color: ${linkColor}`,
            `text-decoration: ${textDecor}`,
            `font-size: ${fontSize}px`,
            `font-weight: ${fontWeight}`,
            `font-style: ${fontStyleVal}`,
            `font-family: ${designSettings.fontFamily}`,
            `line-height: 1.4`,
        ].join(';');

        if (isStacked) {
            const linksHtml = footerLinks.map((link, i) => {
                let html = `<tr><td align="${textAlign}" style="padding: ${i === 0 ? 0 : spacing}px 0 0 0;"><a href="${DOMPurify.sanitize(link.url || '#')}" target="_blank" style="${linkStyle}">${DOMPurify.sanitize(link.text || '')}</a></td></tr>`;
                return html;
            }).join('');

            sectionsHtml += `
                <tr>
                    <td align="${textAlign}" ${!isTransparentBg ? `bgcolor="${bgColor}"` : ''} style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                        <table border="0" cellspacing="0" cellpadding="0" style="margin: ${textAlign === 'center' ? '0 auto' : '0'};">
                            ${linksHtml}
                        </table>
                    </td>
                </tr>
            `;
        } else {
            const linksHtml = footerLinks.map((link, i) => {
                let html = '';
                if (i > 0) {
                    html += `<td style="padding: 0 ${spacing}px; color: ${separatorColor}; font-size: ${fontSize}px; line-height: 1;">${sepChar}</td>`;
                }
                html += `<td><a href="${DOMPurify.sanitize(link.url || '#')}" target="_blank" style="${linkStyle}">${DOMPurify.sanitize(link.text || '')}</a></td>`;
                return html;
            }).join('');

            sectionsHtml += `
                <tr>
                    <td align="${textAlign}" ${!isTransparentBg ? `bgcolor="${bgColor}"` : ''} style="padding: ${d.paddingTop || 0}px ${d.paddingLeftRight || 0}px ${d.paddingBottom || 0}px ${d.paddingLeftRight || 0}px;">
                        <table border="0" cellspacing="0" cellpadding="0" style="margin: ${textAlign === 'center' ? '0 auto' : '0'};">
                            <tr>${linksHtml}</tr>
                        </table>
                    </td>
                </tr>
            `;
        }
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
            return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;"><tr><td style="padding: 15px;">${contentBlocks}</td></tr></table>`;
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
                                <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-right: 8px; vertical-align: top;">
                                    ${offer1Html}
                                </td>
                                <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-left: 8px; vertical-align: top;">
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
                        ${offerHtml}
                    </td>
                </tr>
            `;
        }
    } else if (comp.type === 'sales_offer') {
        const renderSalesOfferContent = (data: Record<string, string>, suffix: string, imageMaxWidth?: number, renderMode: 'full' | 'imageOnly' | 'contentOnly' = 'full') => {
            const rawAddOffers = JSON.parse(data[`additionalOffers${suffix}`] || '[]');
            const addOffers = rawAddOffers.map((o: any) => ({
                ...o,
                separator: DOMPurify.sanitize(o.separator || ''),
                offer: DOMPurify.sanitize(o.offer || ''),
                details: DOMPurify.sanitize(o.details || ''),
                disclaimer: DOMPurify.sanitize(o.disclaimer || '')
            }));
            let contentHtml = '';

            const renderField = (options: any) => {
                if (!options.text) return '';
                const { text, fontSize, color, bgColor, fontWeight, fontStyle, textAlign, paddingTop, paddingBottom, paddingLeftRight } = options;
                const padding = `padding: ${paddingTop || 0}px ${paddingLeftRight || 0}px ${paddingBottom || 0}px ${paddingLeftRight || 0}px;`;
                const style = [`font-family: ${designSettings.fontFamily}`,`color: ${color || '#000'}`,`font-size: ${fontSize || 14}px`,`background-color: ${bgColor === 'transparent' ? 'transparent' : bgColor}`,`font-weight: ${fontWeight || 'normal'}`,`font-style: ${fontStyle || 'normal'}`,`text-align: ${textAlign || 'center'}`,padding,`line-height: 1.2`].join(';');
                return `<div style="${style}">${text.replace(/\n/g, '<br>')}</div>`;
            };
            
            if (renderMode !== 'contentOnly' && data[`imageEnabled${suffix}`] === 'true' && data[`imageSrc${suffix}`]) {
                const imgStyles = `display: block; width: 100%; max-width: ${imageMaxWidth ? `${imageMaxWidth}px` : '100%'}; height: auto; border: 0; border-radius: 8px; margin: 0 auto 15px;`;
                let imgTag = `<img src="${DOMPurify.sanitize(data[`imageSrc${suffix}`] || '')}" alt="${DOMPurify.sanitize(data[`imageAlt${suffix}`] || 'Sales Offer')}" style="${imgStyles}" border="0" />`;
                if (data[`imageLink${suffix}`]) imgTag = `<a href="${DOMPurify.sanitize(data[`imageLink${suffix}`])}" target="_blank" style="text-decoration: none;">${imgTag}</a>`;
                contentHtml += imgTag;
            }

            if (renderMode !== 'imageOnly') {
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`vehicleText${suffix}`]), fontSize: data[`vehicleFontSize${suffix}`], color: data[`vehicleColor${suffix}`], bgColor: data[`vehicleBgColor${suffix}`], fontWeight: 'bold', fontStyle: data[`vehicleFontStyle${suffix}`], textAlign: data[`vehicleTextAlign${suffix}`], paddingTop: data[`vehiclePaddingTop${suffix}`], paddingBottom: data[`vehiclePaddingBottom${suffix}`], paddingLeftRight: data[`vehiclePaddingLeftRight${suffix}`] });
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`mainOfferText${suffix}`]), fontSize: data[`mainOfferFontSize${suffix}`], color: data[`mainOfferColor${suffix}`], bgColor: data[`mainOfferBgColor${suffix}`], fontWeight: '800', fontStyle: data[`mainOfferFontStyle${suffix}`], textAlign: data[`mainOfferTextAlign${suffix}`], paddingTop: data[`mainOfferPaddingTop${suffix}`], paddingBottom: data[`mainOfferPaddingBottom${suffix}`], paddingLeftRight: data[`mainOfferPaddingLeftRight${suffix}`] });
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`detailsText${suffix}`]), fontSize: data[`detailsFontSize${suffix}`], color: data[`detailsColor${suffix}`], bgColor: data[`detailsBgColor${suffix}`], fontWeight: data[`detailsFontWeight${suffix}`], fontStyle: data[`detailsFontStyle${suffix}`], textAlign: data[`detailsTextAlign${suffix}`], paddingTop: data[`detailsPaddingTop${suffix}`], paddingBottom: data[`detailsPaddingBottom${suffix}`], paddingLeftRight: data[`detailsPaddingLeftRight${suffix}`] });

            addOffers.forEach((o: any) => {
                contentHtml += renderField({ text: o.separator, fontSize: o.separatorFontSize, color: o.separatorColor, bgColor: o.separatorBgColor, fontWeight: o.separatorFontWeight, fontStyle: o.separatorFontStyle, textAlign: o.separatorTextAlign, paddingTop: o.separatorPaddingTop, paddingBottom: o.separatorPaddingBottom, paddingLeftRight: o.separatorPaddingLeftRight });
                contentHtml += renderField({ text: o.offer, fontSize: o.offerFontSize, color: o.offerColor, bgColor: o.offerBgColor, fontWeight: o.offerFontWeight, fontStyle: o.offerFontStyle, textAlign: o.offerTextAlign, paddingTop: o.offerPaddingTop, paddingBottom: o.offerPaddingBottom, paddingLeftRight: o.offerPaddingLeftRight });
                contentHtml += renderField({ text: o.details, fontSize: o.detailsFontSize, color: o.detailsColor, bgColor: o.detailsBgColor, fontWeight: o.detailsFontWeight, fontStyle: o.detailsFontStyle, textAlign: o.detailsTextAlign, paddingTop: o.detailsPaddingTop, paddingBottom: o.detailsPaddingBottom, paddingLeftRight: o.detailsPaddingLeftRight });
                contentHtml += renderField({ text: o.disclaimer, fontSize: o.disclaimerFontSize, color: o.disclaimerColor, bgColor: o.disclaimerBgColor, fontWeight: o.disclaimerFontWeight, fontStyle: o.disclaimerFontStyle, textAlign: o.disclaimerTextAlign, paddingTop: o.disclaimerPaddingTop, paddingBottom: o.disclaimerPaddingBottom, paddingLeftRight: o.disclaimerPaddingLeftRight });
            });

            let finalStockVinText = '';
            const sanitizedStockVin = DOMPurify.sanitize(data[`stockVinValue${suffix}`] || '');
            if (sanitizedStockVin.trim() !== '') {
                const label = data[`stockVinType${suffix}`] === 'stock' ? 'Stock #:' : 'VIN:';
                finalStockVinText = `${label} ${sanitizedStockVin.trim()}`;
            }
            contentHtml += renderField({ text: finalStockVinText, fontSize: data[`stockVinFontSize${suffix}`], color: data[`stockVinColor${suffix}`], bgColor: data[`stockVinBgColor${suffix}`], fontWeight: data[`stockVinFontWeight${suffix}`], fontStyle: data[`stockVinFontStyle${suffix}`], textAlign: data[`stockVinTextAlign${suffix}`], paddingTop: data[`stockVinPaddingTop${suffix}`], paddingBottom: data[`stockVinPaddingBottom${suffix}`], paddingLeftRight: data[`stockVinPaddingLeftRight${suffix}`] });

            let finalMileageText = '';
            const sanitizedMileage = DOMPurify.sanitize(data[`mileageValue${suffix}`] || '');
            if (sanitizedMileage.trim() !== '') { finalMileageText = `Mileage: ${sanitizedMileage.trim()}`; }
            contentHtml += renderField({ text: finalMileageText, fontSize: data[`mileageFontSize${suffix}`], color: data[`mileageColor${suffix}`], bgColor: data[`mileageBgColor${suffix}`], fontWeight: data[`mileageFontWeight${suffix}`], fontStyle: data[`mileageFontStyle${suffix}`], textAlign: data[`mileageTextAlign${suffix}`], paddingTop: data[`mileagePaddingTop${suffix}`], paddingBottom: data[`mileagePaddingBottom${suffix}`], paddingLeftRight: data[`mileagePaddingLeftRight${suffix}`] });

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
            let btnMargin = '12px 0 0 0';
            if (btnAlign === 'center') btnMargin = '12px auto 0';
            else if (btnAlign === 'right') btnMargin = '12px 0 0 auto';
            const btnStyles = [`background-color: ${isOutlined ? 'transparent' : btnBgColor}`,`color: ${isOutlined ? btnBgColor : btnTextColor}`,`padding: ${data[`btnPaddingTop${suffix}`] || '12'}px ${data[`btnPaddingLeftRight${suffix}`] || '20'}px ${data[`btnPaddingBottom${suffix}`] || '12'}px`,`text-decoration: none`,`display: block`,`font-weight: bold`,`border-radius: ${radius}`,`font-size: ${data[`btnFontSize${suffix}`] || 16}px`,`font-family: ${designSettings.fontFamily}`,`text-align: center`,isOutlined ? `border: 2px solid ${btnBgColor}` : 'border: 0'].join('; ');
            contentHtml += `<table border="0" cellspacing="0" cellpadding="0" ${btnTableWidthAttr ? `width="${btnTableWidthAttr}"` : ""} style="margin: ${btnMargin}; width: ${btnWidthType === 'full' ? '100%' : (btnTableWidthAttr ? btnTableWidthAttr+'px' : 'auto')}; max-width: 100%;"><tr><td align="center" bgcolor="${isOutlined ? 'transparent' : btnBgColor}" style="border-radius: ${radius};"><a href="${DOMPurify.sanitize(data[`btnLink${suffix}`] || '#')}" target="_blank" style="${btnStyles}">${DOMPurify.sanitize(data[`btnText${suffix}`] || 'View')}</a></td></tr></table>`;
            contentHtml += renderField({ text: DOMPurify.sanitize(data[`disclaimerText${suffix}`]), fontSize: data[`disclaimerFontSize${suffix}`], color: data[`disclaimerColor${suffix}`], bgColor: data[`disclaimerBgColor${suffix}`], fontWeight: data[`disclaimerFontWeight${suffix}`], fontStyle: data[`disclaimerFontStyle${suffix}`], textAlign: data[`disclaimerTextAlign${suffix}`], paddingTop: data[`disclaimerPaddingTop${suffix}`], paddingBottom: data[`disclaimerPaddingBottom${suffix}`], paddingLeftRight: data[`disclaimerPaddingLeftRight${suffix}`] });
            } // end renderMode !== 'imageOnly'

            return contentHtml;
        };
        
        const layout = d.layout || 'center';
        let offerContentHtml = '';

        if (layout === 'grid') {
            const offer1Content = renderSalesOfferContent(d, '', 250);
            const offer2Content = renderSalesOfferContent(d, '2', 250);
            offerContentHtml = `
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tbody>
                        <tr>
                            <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-right: 8px; vertical-align: top;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;"><tr><td style="padding: 15px;">
                                    ${offer1Content}
                                </td></tr></table>
                            </td>
                            <td class="mobile-stack" width="49%" valign="top" style="width: 49%; padding-left: 8px; vertical-align: top;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;"><tr><td style="padding: 15px;">
                                    ${offer2Content}
                                </td></tr></table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else { // Handle single column layouts
            const imageEnabled = d.imageEnabled === 'true';
            if (!imageEnabled) {
                offerContentHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">${renderSalesOfferContent(d, '')}</td></tr></table>`;
            } else if (layout === 'center') {
                offerContentHtml = `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td align="center">${renderSalesOfferContent(d, '')}</td></tr></table>`;
            } else {
                const isRightLayout = layout === 'right';
                const imgColWidth = 180;
                const gutter = 15;
                const imageTd = `<td width="${imgColWidth}" class="mobile-stack mobile-padding-bottom" valign="top" style="width: ${imgColWidth}px; vertical-align: top;">${renderSalesOfferContent(d, '', imgColWidth, 'imageOnly')}</td>`;
                const contentTdLeft = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-left: ${gutter}px;">${renderSalesOfferContent(d, '', undefined, 'contentOnly')}</td>`;
                const contentTdRight = `<td class="mobile-stack" valign="top" style="vertical-align: top; padding-right: ${gutter}px;">${renderSalesOfferContent(d, '', undefined, 'contentOnly')}</td>`;
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
                padding-left: 0 !important;
                padding-right: 0 !important;
            }
            .mobile-stack:not(:last-child) {
                padding-bottom: 20px !important;
            }
            .mobile-stack-spacer {
                display: none !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f5f5f7;">
    <!-- 100% background wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" id="bodyTable" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f7;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 15px 0; border-collapse: collapse;">
                
                <!-- Centering wrapper for Outlook -->
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width: 600px;">
                <tr>
                <td align="center" valign="top" width="600" style="width: 600px;">
                <![endif]-->
                
                <!-- 600px container -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden;">
                    
                    ${sectionsHtml || '<tr><td style="padding: 30px; text-align: center; font-family: sans-serif;">No content added yet.</td></tr>'}
                    
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

    // Show skeleton loading in preview area
    outputPlaceholder.style.display = 'none';
    outputContainer.style.display = 'grid';
    const previewContainer = outputContainer.querySelector('.preview-container') as HTMLElement;
    if (previewPane) previewPane.style.display = 'none';
    const skeletonEl = document.createElement('div');
    skeletonEl.className = 'skeleton-preview';
    skeletonEl.innerHTML = `
        <div class="skeleton skeleton-header"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-button"></div>
        <div class="skeleton skeleton-footer"></div>
    `;
    if (previewContainer) previewContainer.appendChild(skeletonEl);

    setTimeout(() => {
        try {
            const html = generateEmailHtml();
            const codeBlock = document.getElementById('code-block') as HTMLElement;
            if (codeBlock) codeBlock.textContent = html;
            if (previewPane) {
                previewPane.srcdoc = html;
                previewPane.style.display = '';
            }

            // Remove skeleton
            skeletonEl.remove();

            spinner.classList.add('hidden');
            checkmark.classList.remove('hidden');
            btnText.textContent = 'Complete';
            showToast('Template Generated', 'success');

        } catch (err) {
            console.error("Generation failed:", err);
            showToast('Error generating template. Check console for details.', 'error');
            spinner.classList.add('hidden');
            btnText.textContent = 'Generate Template';
            skeletonEl.remove();
            if (previewPane) previewPane.style.display = '';
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
    const allTemplates = getSavedTemplates();
    const removedTemplate = allTemplates.find(t => t.id === id);
    const removedIndex = allTemplates.findIndex(t => t.id === id);
    const templates = allTemplates.filter(t => t.id !== id);
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(templates));
    renderSavedTemplates();
    showToast('Template deleted', 'success', removedTemplate ? () => {
        const current = getSavedTemplates();
        current.splice(removedIndex, 0, removedTemplate);
        localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(current));
        renderSavedTemplates();
    } : undefined);
};

const loadTemplate = (id: string) => {
    const templates = getSavedTemplates();
    const template = templates.find(t => t.id === id);
    if (template) {
        designSettings = { ...designSettings, ...template.designSettings };
        activeComponents = [...template.components];
        if (fontSelect) fontSelect.value = designSettings.fontFamily;
        syncGlobalTextStylesUI();
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
        <div class="card" style="margin-bottom: 6px; background: var(--background-secondary);">
            <div class="card-body" style="padding: var(--spacing-sm) var(--spacing-md); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 class="text-base font-bold">${t.name}</h4>
                    <p class="text-xs" style="color: var(--label-tertiary);">${new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-primary btn-sm load-tpl-btn" data-id="${t.id}">Load</button>
                    <button class="btn btn-ghost btn-sm del-tpl-btn" data-id="${t.id}" style="color: var(--destructive); height: 24px;">Delete</button>
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

// --- Component Library ---

const getSavedLibraryComponents = (): SavedLibraryComponent[] => {
    try {
        const data = localStorage.getItem(LS_LIBRARY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load component library", e);
        return [];
    }
};

const saveComponentToLibrary = (id: string) => {
    const comp = activeComponents.find(c => c.id === id);
    if (!comp) return;

    const defaultName = `${formatComponentTypeName(comp.type)} ${new Date().toLocaleDateString()}`;
    const name = prompt('Save to Component Library.\nEnter a name for this component:', defaultName);
    if (!name) return;

    const libraryItem: SavedLibraryComponent = {
        id: Date.now().toString(),
        name,
        type: comp.type,
        data: JSON.parse(JSON.stringify(comp.data)),
        createdAt: new Date().toISOString(),
    };

    const library = getSavedLibraryComponents();
    library.unshift(libraryItem);
    localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(library));
    renderComponentLibrary();
    showToast('Component saved to library', 'success');
};

const addComponentFromLibrary = (libraryId: string) => {
    const library = getSavedLibraryComponents();
    const libraryItem = library.find(item => item.id === libraryId);
    if (!libraryItem) return;

    const newComponent: EmailComponent = {
        id: Date.now().toString(),
        type: libraryItem.type,
        data: JSON.parse(JSON.stringify(libraryItem.data)),
    };

    activeComponents.push(newComponent);
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`Added "${libraryItem.name}" from library`, 'success');

    setTimeout(() => {
        selectComponent(newComponent.id);
        const newElement = document.querySelector(`.component-item[data-id='${newComponent.id}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newElement.classList.add('highlight-pulse');
            setTimeout(() => newElement.classList.remove('highlight-pulse'), 1000);
        }
    }, 100);
};

const deleteLibraryComponent = (id: string) => {
    const allLibrary = getSavedLibraryComponents();
    const removedItem = allLibrary.find(item => item.id === id);
    const removedIndex = allLibrary.findIndex(item => item.id === id);
    const library = allLibrary.filter(item => item.id !== id);
    localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(library));
    renderComponentLibrary();
    showToast('Component removed from library', 'success', removedItem ? () => {
        const current = getSavedLibraryComponents();
        current.splice(removedIndex, 0, removedItem);
        localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(current));
        renderComponentLibrary();
    } : undefined);
};

const renderComponentLibrary = () => {
    const library = getSavedLibraryComponents();
    if (!componentLibraryList) return;

    if (library.length === 0) {
        componentLibraryList.innerHTML = `<p class="text-sm" style="color: var(--label-secondary); text-align: center;">No saved components. Use the <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">bookmark</span> icon on any section to add it to your library.</p>`;
        return;
    }

    componentLibraryList.innerHTML = library.map(item => `
        <div class="library-item card" style="margin-bottom: 6px; background: var(--background-secondary);">
            <div class="card-body" style="padding: var(--spacing-sm) var(--spacing-md); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); min-width: 0;">
                    <span class="material-symbols-rounded" style="font-size: 16px; color: var(--label-secondary); flex-shrink: 0;">${getComponentTypeIcon(item.type)}</span>
                    <div style="min-width: 0;">
                        <h4 class="text-base font-bold" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h4>
                        <div style="display: flex; align-items: center; gap: var(--spacing-xs);">
                            <span class="library-type-badge">${formatComponentTypeName(item.type)}</span>
                            <span class="text-xs" style="color: var(--label-tertiary);">${new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2" style="flex-shrink: 0;">
                    <button class="btn btn-primary btn-sm add-from-library-btn" data-id="${item.id}">Add</button>
                    <button class="btn btn-ghost btn-sm del-library-btn" data-id="${item.id}" style="color: var(--destructive); height: 24px;">Delete</button>
                </div>
            </div>
        </div>
    `).join('');

    componentLibraryList.querySelectorAll('.add-from-library-btn').forEach(btn => {
        btn.addEventListener('click', () => addComponentFromLibrary(btn.getAttribute('data-id') || ''));
    });
    componentLibraryList.querySelectorAll('.del-library-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteLibraryComponent(btn.getAttribute('data-id') || ''));
    });
};

// --- End Component Library ---

// --- Starter Templates ---

const STARTER_TEMPLATES: Record<string, { name: string; components: EmailComponent[] }> = {
    single_offer: {
        name: 'Single Offer',
        components: [
            { id: 's1', type: 'header', data: { text: 'Exclusive Offer Just for You', fontSize: '22', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'sales_offer', data: { ...getDefaultComponentData('sales_offer'), layout: 'center', vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}', mainOfferText: '$2,500 Trade-In Bonus', detailsText: 'Upgrade your current ride today with our exclusive seasonal offer.', disclaimerText: '*Terms and conditions apply. Offer valid through end of month.', btnText: 'View Details', btnLink: '{{dealership.tracked_website_homepage_url}}' } },
            { id: 's3', type: 'disclaimers', data: { text: '*Terms and conditions apply. See dealer for details. Cannot be combined with other offers.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
    two_column_offers: {
        name: '2-Column Offers',
        components: [
            { id: 's1', type: 'header', data: { text: 'This Month\'s Best Deals', fontSize: '22', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'service_offer', data: { ...getDefaultComponentData('service_offer'), layout: 'two_column', serviceTitle: 'Oil Change Special', couponCode: 'OILCHANGE50', serviceDetails: 'Get $50 off your next oil change. Includes synthetic blend oil and filter.', disclaimer: '*Valid at participating dealers only.', buttonText: 'Schedule Now', serviceTitle2: 'Tire Rotation Deal', couponCode2: 'TIRES25', serviceDetails2: 'Get $25 off your next tire rotation. Keep your tires wearing evenly.', disclaimer2: '*Cannot be combined with other offers.', buttonText2: 'Book Service' } },
            { id: 's3', type: 'disclaimers', data: { text: '*Offers valid at participating dealers. See dealer for complete details.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
    service_and_sales: {
        name: 'Service + Sales',
        components: [
            { id: 's1', type: 'header', data: { text: 'Your Monthly Update', fontSize: '22', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'service_offer', data: { ...getDefaultComponentData('service_offer'), layout: 'single', serviceTitle: 'Brake Inspection Special', couponCode: 'BRAKES30', serviceDetails: 'Complimentary multi-point brake inspection plus $30 off any brake service.', disclaimer: '*Valid at participating dealers only.', buttonText: 'Book Now' } },
            { id: 's3', type: 'divider', data: { width: '80', thickness: '1', lineColor: '#E5E5EA', alignment: 'center', paddingTop: '15', paddingBottom: '15', paddingLeftRight: '0' } },
            { id: 's4', type: 'sales_offer', data: { ...getDefaultComponentData('sales_offer'), layout: 'center', vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}', mainOfferText: '0% APR for 60 Months', detailsText: 'Drive home your dream vehicle with zero-interest financing.', disclaimerText: '*With approved credit. See dealer for details.', btnText: 'Shop Inventory', btnLink: '{{dealership.tracked_website_homepage_url}}' } },
            { id: 's5', type: 'disclaimers', data: { text: '*All offers subject to availability. See dealer for full terms and conditions.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
    recall_notice: {
        name: 'Recall Notice',
        components: [
            { id: 's1', type: 'header', data: { text: 'Important Safety Recall Notice', fontSize: '22', textColor: '#d00000', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '20', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's2', type: 'text_block', data: { text: 'Dear {{customer.first_name}},\n\nA safety recall has been issued for your {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}. This recall affects a critical component and we recommend scheduling your free recall service as soon as possible.\n\nYour safety is our top priority. This service is provided at no cost to you.', fontSize: '13', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', paddingTop: '10', paddingBottom: '10', paddingLeftRight: '15' } },
            { id: 's3', type: 'button', data: { text: 'Schedule Recall Service', link: '{{dealership.tracked_website_homepage_url}}', fontSize: '13', textColor: '#ffffff', backgroundColor: '#d00000', align: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15', widthType: 'full' } },
            { id: 's4', type: 'disclaimers', data: { text: '*This is an important safety notice. Please contact us at {{dealership.phone}} if you have any questions. Recall service is always free of charge.', fontSize: '9', textColor: '#86868b', backgroundColor: 'transparent', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '15', paddingBottom: '12', paddingLeftRight: '15' } },
        ],
    },
};

const loadStarterTemplate = (templateKey: string) => {
    const starter = STARTER_TEMPLATES[templateKey];
    if (!starter) return;

    // Assign unique IDs to each component
    const components = starter.components.map(c => ({
        ...c,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        data: { ...c.data },
    }));

    activeComponents = components;
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`Loaded starter: ${starter.name}`, 'success');
};

// --- Starter Components ---

const STARTER_COMPONENTS: Record<string, { name: string; type: string; data: Record<string, string> }> = {
    hero_header: {
        name: 'Hero Header',
        type: 'header',
        data: { text: 'Your Headline Here', fontSize: '24', textColor: '#1d1d1f', backgroundColor: 'transparent', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', paddingTop: '25', paddingBottom: '15', paddingLeftRight: '15' },
    },
    service_coupon: {
        name: 'Service Coupon',
        type: 'service_offer',
        data: { ...getDefaultComponentData('service_offer'), layout: 'single', serviceTitle: 'Oil Change Special', couponCode: 'SAVE50', serviceDetails: 'Get $50 off your next oil change service. Includes synthetic blend oil and filter replacement.', disclaimer: '*Valid at participating dealers only.', buttonText: 'Schedule Now' },
    },
    vehicle_offer: {
        name: 'Vehicle Offer',
        type: 'sales_offer',
        data: { ...getDefaultComponentData('sales_offer'), layout: 'center', vehicleText: 'New {{customer.last_transaction.vehicle.year}} {{customer.last_transaction.vehicle.make}} {{customer.last_transaction.vehicle.model}}', mainOfferText: '$2,500 Trade-In Bonus', detailsText: 'Upgrade your vehicle today with our exclusive offer.', disclaimerText: '*Terms and conditions apply.', btnText: 'View Details', btnLink: '{{dealership.tracked_website_homepage_url}}' },
    },
    cta_button: {
        name: 'CTA Button',
        type: 'button',
        data: { text: 'Shop Now', link: '{{dealership.tracked_website_homepage_url}}', fontSize: '13', textColor: '#ffffff', backgroundColor: '#007aff', align: 'center', paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15', widthType: 'full' },
    },
};

const addStarterComponent = (componentKey: string) => {
    const starter = STARTER_COMPONENTS[componentKey];
    if (!starter) return;

    const newComponent: EmailComponent = {
        id: Date.now().toString(),
        type: starter.type,
        data: { ...starter.data },
    };

    activeComponents.push(newComponent);
    saveToHistory();
    renderComponents();
    saveDraft();
    showToast(`Added: ${starter.name}`, 'success');

    setTimeout(() => {
        selectComponent(newComponent.id);
        const newElement = document.querySelector(`.component-item[data-id='${newComponent.id}']`);
        if (newElement) {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

// --- End Starter Templates & Components ---

const loadDraft = () => {
    try {
        const data = localStorage.getItem(LS_DRAFT_KEY);
        if (data) {
            const draft = JSON.parse(data);
            if (draft && draft.designSettings && Array.isArray(draft.activeComponents)) {
                designSettings = { ...designSettings, ...draft.designSettings };
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
          <div class="button-style-stack">
            <div class="button-style-option ${designSettings.buttonStyle === 'rounded' ? 'selected' : ''}" data-button="rounded">
              <div class="button-preview" style="background: #007aff; border-radius: 8px;">Rounded</div>
            </div>
            <div class="button-style-option ${designSettings.buttonStyle === 'pill' ? 'selected' : ''}" data-button="pill">
              <div class="button-preview" style="background: #007aff; border-radius: 20px;">Pill</div>
            </div>
            <div class="button-style-option ${designSettings.buttonStyle === 'square' ? 'selected' : ''}" data-button="square">
              <div class="button-preview" style="background: #007aff; border-radius: 0px;">Square</div>
            </div>
            <div class="button-style-option ${designSettings.buttonStyle === 'outlined' ? 'selected' : ''}" data-button="outlined">
              <div class="button-preview" style="background: transparent; border: 2px solid #007aff; color: #007aff; border-radius: 8px;">Outlined</div>
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
            data-tooltip="Align ${opt}"
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
                    <div style="display: flex; gap: 4px;">
                        ${keys.fontWeight ? `<button type="button" class="btn btn-secondary format-toggle style-control ${data[keys.fontWeight] === 'bold' ? 'active' : ''}" data-style-key="${keys.fontWeight}" data-val-on="bold" data-val-off="normal" style="font-weight: 800; font-size: 11px; width: 27px; height: 27px; padding: 0; border-radius: var(--radius-md);">B</button>` : ''}
                        ${keys.fontStyle ? `<button type="button" class="btn btn-secondary format-toggle style-control ${data[keys.fontStyle] === 'italic' ? 'active' : ''}" data-style-key="${keys.fontStyle}" data-val-on="italic" data-val-off="normal" style="font-style: italic; font-size: 11px; width: 27px; height: 27px; padding: 0; border-radius: var(--radius-md);">I</button>`: ''}
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

const getDefaultFieldStyles = (compType: string, fieldKey: string, subOfferIndex?: number): Record<string, string> => {
    switch (compType) {
        case 'header':
            return {
                fontSize: designSettings.globalFontSize || '18',
                textColor: designSettings.globalBodyColor || '#1d1d1f',
                backgroundColor: 'transparent',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textAlign: 'center',
                paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15'
            };
        case 'text_block':
            return {
                fontSize: designSettings.globalFontSize || '12',
                textColor: designSettings.globalBodyColor || '#3c3c43',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
                paddingTop: '8', paddingBottom: '8', paddingLeftRight: '15'
            };
        case 'disclaimers':
            return {
                fontSize: '9',
                textColor: '#86868b',
                backgroundColor: 'transparent',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'center',
                paddingTop: '12', paddingBottom: '12', paddingLeftRight: '15'
            };
        case 'button':
            return {
                fontSize: '12',
                textColor: '#ffffff',
                backgroundColor: designSettings.globalLinkColor || '#007aff',
                align: 'center',
                paddingTop: '9', paddingBottom: '9', paddingLeftRight: '15',
                widthType: 'auto'
            };
        case 'footer': {
            if (fieldKey === 'footerLinks') {
                return {
                    fontSize: '12', fontWeight: 'normal', fontStyle: 'normal',
                    textDecoration: 'none', textColor: designSettings.globalLinkColor || '#007aff',
                };
            }
            if (fieldKey === 'footerSeparator') {
                return { separatorColor: '#c7c7cc', separatorStyle: 'dot', linkSpacing: '12' };
            }
            if (fieldKey === 'footerContainer') {
                return {
                    textAlign: 'center', backgroundColor: 'transparent',
                    paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15',
                };
            }
            return {
                fontSize: '12', fontWeight: 'normal', fontStyle: 'normal',
                textDecoration: 'none', textAlign: 'center',
                textColor: designSettings.globalLinkColor || '#007aff',
                backgroundColor: 'transparent', separatorColor: '#c7c7cc', separatorStyle: 'dot',
                paddingTop: '15', paddingBottom: '15', paddingLeftRight: '15', linkSpacing: '12',
            };
        }
        case 'divider':
            return {
                width: '100', thickness: '1', lineColor: '#CCCCCC',
                alignment: 'center',
                paddingTop: '12', paddingBottom: '12', paddingLeftRight: '0'
            };
        case 'spacer':
            return {
                height: '30', backgroundColor: 'transparent', matchEmailBackground: 'true'
            };
        case 'image':
            return {
                width: '100%', align: 'center',
                paddingTop: '0', paddingBottom: '0', paddingLeftRight: '0'
            };
        case 'service_offer': {
            const suffix = fieldKey.endsWith('2') ? '2' : '';
            const baseKey = fieldKey.replace(/2$/, '');
            switch (baseKey) {
                case 'serviceOfferTitle': {
                    const p = 'title';
                    return {
                        [`${p}FontSize${suffix}`]: '18', [`${p}FontWeight${suffix}`]: 'bold', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#000000', [`${p}BgColor${suffix}`]: 'transparent', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '8', [`${p}PaddingBottom${suffix}`]: '8', [`${p}PaddingLeftRight${suffix}`]: '0'
                    };
                }
                case 'serviceOfferCoupon': {
                    const p = 'coupon';
                    return {
                        [`${p}FontSize${suffix}`]: '15', [`${p}FontWeight${suffix}`]: 'bold', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#0066FF', [`${p}BgColor${suffix}`]: '#F0F7FF', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '6', [`${p}PaddingBottom${suffix}`]: '6', [`${p}PaddingLeftRight${suffix}`]: '12'
                    };
                }
                case 'serviceOfferDetails': {
                    const p = 'details';
                    return {
                        [`${p}FontSize${suffix}`]: '12', [`${p}FontWeight${suffix}`]: 'normal', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#333333', [`${p}BgColor${suffix}`]: 'transparent', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '9', [`${p}PaddingBottom${suffix}`]: '9', [`${p}PaddingLeftRight${suffix}`]: '0'
                    };
                }
                case 'serviceOfferDisclaimer': {
                    const p = 'disclaimer';
                    return {
                        [`${p}FontSize${suffix}`]: '9', [`${p}FontWeight${suffix}`]: 'normal', [`${p}FontStyle${suffix}`]: 'normal',
                        [`${p}TextColor${suffix}`]: '#666666', [`${p}BgColor${suffix}`]: 'transparent', [`${p}Alignment${suffix}`]: 'center',
                        [`${p}PaddingTop${suffix}`]: '6', [`${p}PaddingBottom${suffix}`]: '6', [`${p}PaddingLeftRight${suffix}`]: '0'
                    };
                }
                case 'serviceOfferButton':
                    return {
                        [`buttonFontSize${suffix}`]: '12', [`buttonAlignment${suffix}`]: 'center',
                        [`buttonBgColor${suffix}`]: '#0066FF', [`buttonTextColor${suffix}`]: '#FFFFFF',
                        [`buttonPaddingTop${suffix}`]: '9', [`buttonPaddingBottom${suffix}`]: '9', [`buttonPaddingLeftRight${suffix}`]: '15',
                        [`buttonWidth${suffix}`]: 'auto'
                    };
                case 'serviceOfferImage':
                    return {
                        [`imageWidth${suffix}`]: '100', [`imageAlignment${suffix}`]: 'center',
                        [`imagePaddingTop${suffix}`]: '8', [`imagePaddingBottom${suffix}`]: '8'
                    };
                default: return {};
            }
        }
        case 'sales_offer': {
            const suffix = fieldKey.endsWith('2') ? '2' : '';
            const prefix = fieldKey.replace(/2$/, '');

            if (fieldKey.startsWith('salesOfferButton')) {
                return {
                    [`btnFontSize${suffix}`]: '12', [`btnPaddingTop${suffix}`]: '9', [`btnPaddingBottom${suffix}`]: '9', [`btnPaddingLeftRight${suffix}`]: '15',
                    [`btnColor${suffix}`]: '#007aff', [`btnTextColor${suffix}`]: '#ffffff', [`btnAlign${suffix}`]: 'center', [`btnWidthType${suffix}`]: 'full'
                };
            }

            const finalPrefix = prefix.replace(/2$/, '');
            const keySuffix = subOfferIndex !== undefined ? '' : suffix;

            const defaultsByPrefix: Record<string, Record<string, string>> = {
                vehicle: { FontSize: '18', FontWeight: 'normal', FontStyle: 'normal', Color: '#1d1d1f', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '0', PaddingBottom: '6', PaddingLeftRight: '0' },
                mainOffer: { FontSize: '21', FontWeight: 'normal', FontStyle: 'normal', Color: '#007aff', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '0', PaddingBottom: '6', PaddingLeftRight: '0' },
                details: { FontSize: '12', FontWeight: 'normal', FontStyle: 'normal', Color: '#6e6e73', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '0', PaddingBottom: '9', PaddingLeftRight: '0' },
                stockVin: { FontSize: '12', FontWeight: 'normal', FontStyle: 'normal', Color: '#86868b', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '8', PaddingBottom: '0', PaddingLeftRight: '0' },
                mileage: { FontSize: '12', FontWeight: 'normal', FontStyle: 'normal', Color: '#86868b', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '3', PaddingBottom: '0', PaddingLeftRight: '0' },
                disclaimer: { FontSize: '9', FontWeight: 'normal', FontStyle: 'normal', Color: '#86868b', BgColor: 'transparent', TextAlign: 'center', PaddingTop: '12', PaddingBottom: '0', PaddingLeftRight: '0' }
            };

            const prefixDefaults = defaultsByPrefix[finalPrefix];
            if (!prefixDefaults) return {};

            const result: Record<string, string> = {};
            for (const [prop, val] of Object.entries(prefixDefaults)) {
                result[`${finalPrefix}${prop}${keySuffix}`] = val;
            }
            return result;
        }
        default: return {};
    }
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
            <div style="display: flex; align-items: center; gap: 3px;">
                <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--label-tertiary);">${formattedCompType}</span>
                <span style="color: var(--label-tertiary); font-size: 9px; padding-bottom: 2px;">›</span>
                <span style="font-size: 11px; font-weight: 600; color: var(--label-primary);">${activeField.fieldLabel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
                <button type="button" id="reset-field-styles-btn" class="btn btn-ghost" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; color: var(--label-secondary); line-height: 1;">Reset</button>
                <button type="button" id="close-styling-panel-btn" class="btn btn-ghost" style="width: 18px; height: 18px; padding: 0; border-radius: 50%; line-height: 1;">&times;</button>
            </div>
        </div>
        <div class="design-option-group" style="border-top: 1px solid var(--separator-secondary); padding-top: var(--spacing-md);">
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
        const configKey = Object.keys(config.alignment)[0];
        const dataKey = config.alignment[configKey];
        html += `
            <div class="form-group">
                <label class="form-label">Alignment</label>
                ${alignmentControlHtml(dataKey, data[dataKey] || 'center')}
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

    dynamicStylingContainer.querySelector('#reset-field-styles-btn')?.addEventListener('click', () => {
        if (!activeField) return;
        const comp = activeComponents.find(c => c.id === activeField!.componentId);
        if (!comp) return;
        const defaults = getDefaultFieldStyles(comp.type, activeField.fieldKey, activeField.subOfferIndex);
        for (const [key, value] of Object.entries(defaults)) {
            updateFn(key, value);
        }
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
        case 'disclaimers':
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

        case 'footer': {
            const footerFieldKey = activeField.fieldKey;
            if (footerFieldKey === 'footerLinks') {
                renderStandardStylingPanel(comp.data, {
                    typography: { fontSize: 'fontSize', fontWeight: 'fontWeight', fontStyle: 'fontStyle' },
                    colors: [
                        { key: 'textColor', label: 'Link Color' },
                    ],
                    customHtml: () => {
                        const currentDecor = comp.data.textDecoration || 'none';
                        return `
                            <div class="styling-section">
                                <h4 class="styling-section-title">Text Decoration</h4>
                                <div style="display: flex; gap: 4px;">
                                    <button type="button" class="btn btn-secondary format-toggle style-control ${currentDecor === 'underline' ? 'active' : ''}" data-style-key="textDecoration" data-val-on="underline" data-val-off="none" style="font-size: 11px; width: 27px; height: 27px; padding: 0; border-radius: var(--radius-md); text-decoration: underline;">U</button>
                                </div>
                            </div>
                        `;
                    },
                }, baseUpdateFn);
            } else if (footerFieldKey === 'footerSeparator') {
                renderStandardStylingPanel(comp.data, {
                    colors: [
                        { key: 'separatorColor', label: 'Separator Color' },
                    ],
                    customHtml: () => {
                        const currentStyle = comp.data.separatorStyle || 'dot';
                        return `
                            <div class="styling-section">
                                <h4 class="styling-section-title">Separator Style</h4>
                                <div class="footer-separator-style-picker">
                                    <button type="button" class="btn btn-secondary style-control format-toggle ${currentStyle === 'dot' ? 'active' : ''}" data-style-key="separatorStyle" data-val-on="dot" data-val-off="dot" style="font-size: 13px; min-width: 36px; height: 27px; padding: 0 6px; border-radius: var(--radius-md);">·</button>
                                    <button type="button" class="btn btn-secondary style-control format-toggle ${currentStyle === 'pipe' ? 'active' : ''}" data-style-key="separatorStyle" data-val-on="pipe" data-val-off="pipe" style="font-size: 13px; min-width: 36px; height: 27px; padding: 0 6px; border-radius: var(--radius-md);">|</button>
                                    <button type="button" class="btn btn-secondary style-control format-toggle ${currentStyle === 'dash' ? 'active' : ''}" data-style-key="separatorStyle" data-val-on="dash" data-val-off="dash" style="font-size: 13px; min-width: 36px; height: 27px; padding: 0 6px; border-radius: var(--radius-md);">—</button>
                                </div>
                            </div>
                            <div class="styling-section">
                                <h4 class="styling-section-title">Spacing</h4>
                                <div class="grid grid-cols-2">
                                    <div class="form-group">
                                        <label class="form-label">Link Spacing (px)</label>
                                        <input type="number" class="form-control style-control" data-style-key="linkSpacing" value="${comp.data.linkSpacing || '12'}" min="0" max="60">
                                    </div>
                                </div>
                            </div>
                        `;
                    },
                }, baseUpdateFn);
            } else if (footerFieldKey === 'footerContainer') {
                renderStandardStylingPanel(comp.data, {
                    colors: [
                        { key: 'backgroundColor', label: 'Background' },
                    ],
                    alignment: { textAlign: 'textAlign' },
                    padding: [
                        { key: 'paddingTop', label: 'Padding T' },
                        { key: 'paddingBottom', label: 'Padding B' },
                        { key: 'paddingLeftRight', label: 'Padding L/R' },
                    ],
                }, baseUpdateFn);
            } else {
                // Fallback: show all footer controls
                renderStandardStylingPanel(comp.data, {
                    typography: { fontSize: 'fontSize', fontWeight: 'fontWeight', fontStyle: 'fontStyle' },
                    colors: [
                        { key: 'textColor', label: 'Link Color' },
                        { key: 'separatorColor', label: 'Separator Color' },
                        { key: 'backgroundColor', label: 'Background' }
                    ],
                    alignment: { textAlign: 'textAlign' },
                    padding: [
                        { key: 'paddingTop', label: 'Padding T' },
                        { key: 'paddingBottom', label: 'Padding B' },
                        { key: 'paddingLeftRight', label: 'Padding L/R' },
                        { key: 'linkSpacing', label: 'Link Spacing' }
                    ],
                }, baseUpdateFn);
            }
            break;
        }

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
                    const keySuffix = activeField.subOfferIndex !== undefined ? '' : suffix;
                     renderStandardStylingPanel(dataObject, {
                        typography: { fontSize: `${finalPrefix}FontSize${keySuffix}`, fontWeight: `${finalPrefix}FontWeight${keySuffix}`, fontStyle: `${finalPrefix}FontStyle${keySuffix}` },
                        colors: [ { key: `${finalPrefix}Color${keySuffix}`, label: 'Text Color'}, { key: `${finalPrefix}BgColor${keySuffix}`, label: 'Background'} ],
                        alignment: { textAlign: `${finalPrefix}TextAlign${keySuffix}`},
                        padding: [ { key: `${finalPrefix}PaddingTop${keySuffix}`, label: 'Padding T'}, { key: `${finalPrefix}PaddingBottom${keySuffix}`, label: 'Padding B'}, { key: `${finalPrefix}PaddingLeftRight${keySuffix}`, label: 'Padding L/R' } ]
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
        { key: 'b', ctrl: true, description: 'Save section to library', category: 'Components', condition: () => !!selectedComponentId, action: () => selectedComponentId && saveComponentToLibrary(selectedComponentId) },
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

const blendWithWhite = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha)).toString(16).padStart(2,'0');
    return `#${mix(r)}${mix(g)}${mix(b)}`;
};

const propagateBodyColor = (color: string) => {
    designSettings.globalBodyColor = color;
    const secondary = blendWithWhite(color, 0.55);
    const tertiary  = blendWithWhite(color, 0.40);
    activeComponents.forEach(comp => {
        if (['header', 'text_block'].includes(comp.type)) {
            comp.data.textColor = color;
        }
        if (comp.type === 'disclaimers') {
            comp.data.textColor = tertiary;
        }
        if (comp.type === 'sales_offer') {
            ['', '2'].forEach(sfx => {
                comp.data[`vehicleColor${sfx}`]    = color;
                comp.data[`detailsColor${sfx}`]    = secondary;
                comp.data[`stockVinColor${sfx}`]   = tertiary;
                comp.data[`mileageColor${sfx}`]    = tertiary;
                comp.data[`disclaimerColor${sfx}`] = tertiary;
                const key = `additionalOffers${sfx}`;
                try {
                    const offers = JSON.parse(comp.data[key] || '[]');
                    comp.data[key] = JSON.stringify(offers.map((o: any) => ({
                        ...o,
                        separatorColor:  color,
                        offerColor:      color,
                        detailsColor:    secondary,
                        disclaimerColor: tertiary,
                    })));
                } catch {}
            });
        }
        if (comp.type === 'service_offer') {
            ['', '2'].forEach(sfx => {
                comp.data[`titleTextColor${sfx}`]      = color;
                comp.data[`detailsTextColor${sfx}`]    = secondary;
                comp.data[`disclaimerTextColor${sfx}`] = tertiary;
            });
        }
    });
    saveDraft();
    saveToHistory();
    triggerPreviewUpdate();
};

const propagateLinkColor = (color: string) => {
    designSettings.globalLinkColor = color;
    activeComponents.forEach(comp => {
        if (comp.type === 'button') comp.data.backgroundColor = color;
        if (comp.type === 'service_offer') {
            comp.data.buttonBgColor = color; comp.data.buttonBgColor2 = color;
            comp.data.couponTextColor = color; comp.data.couponTextColor2 = color;
        }
        if (comp.type === 'sales_offer') {
            comp.data.btnColor = color; comp.data.btnColor2 = color;
            comp.data.mainOfferColor = color; comp.data.mainOfferColor2 = color;
        }
        if (comp.type === 'footer') comp.data.textColor = color;
    });
    saveDraft();
    saveToHistory();
    triggerPreviewUpdate();
};

const syncGlobalTextStylesUI = () => {
    const grid = document.getElementById('color-scheme-grid');
    if (!grid) return;
    grid.querySelectorAll('.color-scheme-card').forEach(card => {
        const el = card as HTMLElement;
        const match = el.dataset.bodyColor === designSettings.globalBodyColor &&
                      el.dataset.accentColor === designSettings.globalLinkColor;
        el.classList.toggle('selected', match);
    });
};

function initGlobalTextStyles() {
    const grid = document.getElementById('color-scheme-grid');
    if (!grid) return;

    // Render preset scheme cards (no name label)
    grid.innerHTML = COLOR_SCHEMES.map(scheme => {
        const isActive = designSettings.globalBodyColor === scheme.bodyColor &&
                         designSettings.globalLinkColor === scheme.accentColor;
        return `
            <div class="color-scheme-card${isActive ? ' selected' : ''}"
                 data-scheme-id="${scheme.id}"
                 data-body-color="${scheme.bodyColor}"
                 data-accent-color="${scheme.accentColor}"
                 data-tooltip="${scheme.name}">
              <div class="scheme-swatches">
                <div class="scheme-swatch" style="background:${scheme.bodyColor};"></div>
                <div class="scheme-swatch" style="background:${scheme.accentColor};"></div>
              </div>
            </div>`;
    }).join('');

    // Append custom scheme card with live color pickers
    const isCustom = designSettings.colorScheme === 'custom';
    grid.innerHTML += `
        <div class="color-scheme-card${isCustom ? ' selected' : ''}" data-scheme-id="custom" data-tooltip="Custom">
          <div class="scheme-swatches">
            <div class="color-input-container mini" onclick="this.querySelector('input[type=color]').click()">
              <div class="color-swatch-display" style="background-color:${designSettings.globalBodyColor};"></div>
              <input type="color" class="color-input-hidden" id="custom-body-color" value="${designSettings.globalBodyColor}">
            </div>
            <div class="color-input-container mini" onclick="this.querySelector('input[type=color]').click()">
              <div class="color-swatch-display" style="background-color:${designSettings.globalLinkColor};"></div>
              <input type="color" class="color-input-hidden" id="custom-accent-color" value="${designSettings.globalLinkColor}">
            </div>
          </div>
        </div>`;

    // Click handler — skip propagation for custom card (color inputs handle it)
    grid.addEventListener('click', (e) => {
        const card = (e.target as Element).closest('.color-scheme-card') as HTMLElement | null;
        if (!card) return;
        const schemeId = card.dataset.schemeId!;

        if (schemeId === 'custom') {
            designSettings.colorScheme = 'custom';
            grid.querySelectorAll('.color-scheme-card').forEach(c => c.classList.toggle('selected', c === card));
            return;
        }

        const bodyColor   = card.dataset.bodyColor!;
        const accentColor = card.dataset.accentColor!;
        designSettings.colorScheme = schemeId;
        propagateBodyColor(bodyColor);
        propagateLinkColor(accentColor);
        grid.querySelectorAll('.color-scheme-card').forEach(c => c.classList.toggle('selected', c === card));
    });

    // Live listeners for custom color pickers
    const customBodyInput   = document.getElementById('custom-body-color')   as HTMLInputElement | null;
    const customAccentInput = document.getElementById('custom-accent-color') as HTMLInputElement | null;

    customBodyInput?.addEventListener('input', () => {
        designSettings.colorScheme = 'custom';
        const swatch = customBodyInput.previousElementSibling as HTMLElement | null;
        if (swatch) swatch.style.backgroundColor = customBodyInput.value;
        propagateBodyColor(customBodyInput.value);
        grid.querySelectorAll('.color-scheme-card').forEach(c =>
            c.classList.toggle('selected', (c as HTMLElement).dataset.schemeId === 'custom'));
    });

    customAccentInput?.addEventListener('input', () => {
        designSettings.colorScheme = 'custom';
        const swatch = customAccentInput.previousElementSibling as HTMLElement | null;
        if (swatch) swatch.style.backgroundColor = customAccentInput.value;
        propagateLinkColor(customAccentInput.value);
        grid.querySelectorAll('.color-scheme-card').forEach(c =>
            c.classList.toggle('selected', (c as HTMLElement).dataset.schemeId === 'custom'));
    });
}


saveTemplateBtn?.addEventListener('click', saveTemplate);

// Starter template click handlers
document.querySelectorAll('[data-starter-template]').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-starter-template');
        if (key) loadStarterTemplate(key);
    });
});

// Starter component click handlers
document.querySelectorAll('[data-starter-component]').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-starter-component');
        if (key) addStarterComponent(key);
    });
});

loadCollapsedStates();
renderMergeFieldsSidebar();
loadDraft();
initGlobalTextStyles();
renderComponents();
renderSavedTemplates();
renderComponentLibrary();
initKeyboardShortcuts();
autocompleteDropdown = document.getElementById('autocomplete-dropdown');

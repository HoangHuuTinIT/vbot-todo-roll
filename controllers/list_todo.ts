// controllers/list_todo.ts
import { ref, computed, onMounted, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getTodos, getTodoCount, deleteTodo, updateTodo } from '@/api/todo';
import { useAuthStore } from '@/stores/auth';
import { TODO_STATUS } from '@/utils/constants';
import { buildTodoParams } from '@/models/todo';
import { TODO_SOURCE } from '@/utils/enums';
import type { TodoItem } from '@/types/todo';
import { getAllMembers } from '@/api/project';
import { showSuccess, showError } from '@/utils/toast';
import { useCustomerFilter } from '@/composables/useCustomerFilter';
import { useI18n } from 'vue-i18n';

const useInfinitePagination = (defaultSize = 15) => {
	const startPage = ref(1);
	const pageNo = ref(1);
	const pageSize = ref(defaultSize);
	const totalCount = ref(0);
	const activePage = ref(1);

	const totalPages = computed(() => {
		if (totalCount.value === 0) return 1;
		return Math.ceil(totalCount.value / pageSize.value);
	});


	const resetPagination = () => {
		startPage.value = 1;
		pageNo.value = 1;
		activePage.value = 1;
		totalCount.value = 0;
	};

	return { startPage, pageNo, pageSize, totalCount, totalPages, activePage, resetPagination };
};

export const useListTodoController = () => {
	const { t } = useI18n();
	const todos = ref<TodoItem[]>([]);

	const { startPage, pageNo, pageSize, totalCount, totalPages, activePage, resetPagination } = useInfinitePagination(15);

	const pageSizeOptions = [5, 10, 15, 20];


	const isLoading = ref<boolean>(false);
	const isLoadingMore = ref<boolean>(false);
	const isLoadingPrev = ref<boolean>(false);
	const isRefreshing = ref<boolean>(false);


	const isFilterOpen = ref<boolean>(false);
	const authStore = useAuthStore();
	const isQuickCompleteOpen = ref<boolean>(false);
	const quickTodos = ref<TodoItem[]>([]);
	const isLoadingQuick = ref<boolean>(false);
	const showCustomerModal = ref(false);
	const selectedCustomerName = ref('');
	const isConfirmDeleteOpen = ref<boolean>(false);
	const itemToDelete = ref<TodoItem | null>(null);

	const statusOptions = computed(() => [
		t('common.all'),
		t('todo.status_todo'),
		t('todo.status_progress'),
		t('todo.status_done'),
		t('todo.status_overdue')
	]);
	const statusValues = ['', TODO_STATUS.NEW, TODO_STATUS.IN_PROGRESS, TODO_STATUS.DONE, TODO_STATUS.OVERDUE];
	const statusIndex = ref<number>(0);

	const rawMemberList = ref<any[]>([]);
	const creatorOptions = computed(() => {
		const names = rawMemberList.value.map(m => m.UserName || t('common.unknown_member'));
		return [t('common.all'), ...names];
	});
	const creatorIndex = ref(0);

	const assigneeOptions = computed(() => {
		const names = rawMemberList.value.map(m => m.UserName || t('common.hidden_member'));
		return [t('common.all'), ...names];
	});
	const assigneeIndex = ref(0);

	const sourceOptions = computed(() => [
		t('common.all'),
		t('source.call'),
		t('source.customer'),
		t('source.conversation'),
		t('source.message')
	]);
	const sourceValues = ['', TODO_SOURCE.CALL, TODO_SOURCE.CUSTOMER, TODO_SOURCE.CONVERSATION, TODO_SOURCE.CHAT_MESSAGE];
	const sourceIndex = ref<number>(0);

	const filter = ref({
		title: '', jobCode: '',
		createdFrom: '', createdTo: '',
		dueDateFrom: '', dueDateTo: '',
		customerCode: '',
		notifyFrom: '', notifyTo: '',
	});

	const fetchFilterMembers = async () => {
		if (rawMemberList.value.length > 0) return;
		try {
			const data = await getAllMembers();
			rawMemberList.value = data;
		} catch (error) {
			console.error('Lỗi lấy danh sách thành viên filter:', error);
		}
	};

	const {
		customerList,
		loadingCustomer,
		loadingMore,
		fetchCustomers,
		loadMoreCustomers
	} = useCustomerFilter();

	const getTodoList = async (direction: 'init' | 'next' | 'prev' = 'init') => {
		if (direction === 'next' && (isLoadingMore.value || pageNo.value > totalPages.value)) return;
		if (direction === 'prev' && (isLoadingPrev.value || startPage.value <= 1)) return;

		if (direction === 'next') isLoadingMore.value = true;
		else if (direction === 'prev') isLoadingPrev.value = true;
		else {
			isLoading.value = true;
			todos.value = [];
		}

		try {
			let targetPage = 1;

			if (direction === 'next') targetPage = pageNo.value;
			else if (direction === 'prev') targetPage = startPage.value - 1;
			else targetPage = pageNo.value;

			let selectedCreatorId = '';
			if (creatorIndex.value > 0) {
				const member = rawMemberList.value[creatorIndex.value - 1];
				selectedCreatorId = member.memberUID || '';
			}

			let selectedAssigneeId = '';
			if (assigneeIndex.value > 0) {
				const member = rawMemberList.value[assigneeIndex.value - 1];
				selectedAssigneeId = member.memberUID || '';
			}

			const filterParams = buildTodoParams(
				filter.value,
				statusValues[statusIndex.value],
				sourceValues[sourceIndex.value],
				selectedCreatorId,
				selectedAssigneeId
			);

			const [listData, countData] = await Promise.all([
				getTodos({
					...filterParams,
					pageNo: targetPage,
					pageSize: pageSize.value
				}),
				(direction === 'init' || totalCount.value === 0) ? getTodoCount(filterParams) : Promise.resolve(totalCount.value)
			]);

			if (direction === 'next') {
				todos.value = [...todos.value, ...(listData || [])];
			} else if (direction === 'prev') {
				if (listData && listData.length > 0) {
					todos.value = [...listData, ...todos.value];
					startPage.value = targetPage;
				}
			} else {
				todos.value = listData || [];
				startPage.value = targetPage;
			}

			if (direction === 'init' || totalCount.value === 0) {
				totalCount.value = countData || 0;
			}

		} catch (error) {
			console.error(error);
			showError(t('common.error_load'));
		} finally {
			isLoading.value = false;
			isLoadingMore.value = false;
			isLoadingPrev.value = false;
			uni.stopPullDownRefresh();
		}
	};
	const onLoadMore = () => {
		if (pageNo.value < totalPages.value && !isLoadingMore.value && !isLoading.value) {
			pageNo.value += 1;
			getTodoList('next');
		}
	};

	const onLoadPrev = async () => {
		if (startPage.value > 1 && !isLoadingPrev.value && !isLoading.value) {
			await getTodoList('prev');
		}
	};

	const onUpdatePageSize = (newSize: number) => {
		pageSize.value = newSize;
		resetPagination();
		getTodoList('init');
	};

	const jumpToPage = (targetPage: number) => {
		if (targetPage === pageNo.value && startPage.value === targetPage) return;
		pageNo.value = targetPage;
		startPage.value = targetPage;
		activePage.value = targetPage;

		getTodoList('init');
	};

	const openQuickComplete = async () => {
		isQuickCompleteOpen.value = true;
		isLoadingQuick.value = true;
		try {
			const data = await getTodos({
				pageNo: 1,
				pageSize: 100, status: ''
			});
			if (Array.isArray(data)) {
				quickTodos.value = data.filter(item => item.status !== TODO_STATUS.DONE);
			} else {
				quickTodos.value = [];
			}
		} catch (error) {
			console.error('Lỗi lấy danh sách hoàn thành nhanh:', error);
			showError(t('common.error_load'));
		} finally {
			isLoadingQuick.value = false;
		}
	};

	const closeQuickComplete = () => {
		isQuickCompleteOpen.value = false;
	};

	const handleQuickMarkDone = async (item: TodoItem) => {
		uni.showLoading({ title: t('common.processing') });
		try {
			const payload = { ...item, status: TODO_STATUS.DONE, preFixCode: "TODO", description: item.description || "", files: "", tagCodes: "" };
			const res = await updateTodo(payload as any);
			if (res) {
				showSuccess(t('common.msg_completed'));
				quickTodos.value = quickTodos.value.filter(t => t.id !== item.id);
				const index = todos.value.findIndex(t => t.id === item.id);
				if (index !== -1) {
					todos.value[index].status = TODO_STATUS.DONE;
				}
			}
		} catch (error) {
			console.error("Lỗi quick complete:", error);
			showError(t('common.error_update'));
		} finally {
			uni.hideLoading();
		}
	};

	const openCustomerPopup = () => {
		showCustomerModal.value = true;
		fetchFilterMembers();
		if (customerList.value.length === 0) {
			fetchCustomers({});
		}
	};
	const onCustomerSelect = (customer: any) => {
		filter.value.customerCode = customer.uid;
		selectedCustomerName.value = customer.name;
		showCustomerModal.value = false;
	};
	const onFilterCustomerInModal = (filterParams: any) => {
		fetchCustomers(filterParams);
	};

	const onRequestDelete = (item: TodoItem) => { itemToDelete.value = item; isConfirmDeleteOpen.value = true; };
	const cancelDelete = () => { isConfirmDeleteOpen.value = false; itemToDelete.value = null; };

	const confirmDelete = async () => {
		if (!itemToDelete.value) return;
		const idToDelete = itemToDelete.value.id;
		try {
			await deleteTodo(idToDelete);
			showSuccess(t('common.success_delete'));
			isConfirmDeleteOpen.value = false;
			// Cập nhật danh sách local sau khi xóa thành công
			todos.value = todos.value.filter(t => t.id !== idToDelete);
			totalCount.value = Math.max(0, totalCount.value - 1);
			itemToDelete.value = null;
		} catch (error) {
			console.error("Delete Error:", error);
			showError(t('common.fail_delete'));
		}
	};

	const showActionMenu = (item: TodoItem) => {
		uni.showActionSheet({
			itemList: [t('common.delete')],
			itemColor: '#ff3b30',
			success: (res) => {
				if (res.tapIndex === 0) onRequestDelete(item);
			}
		});
	};

	const addNewTask = () => { uni.navigateTo({ url: '/pages/todo/create_todo' }); };
	const openFilter = () => {
		isFilterOpen.value = true;
		fetchFilterMembers();
	};
	const closeFilter = () => { isFilterOpen.value = false; };

	const onStatusChange = (e: any) => { statusIndex.value = e.detail.value; };
	const onCreatorChange = (e: any) => { creatorIndex.value = e.detail.value; };
	const onAssigneeChange = (e: any) => { assigneeIndex.value = e.detail.value; };
	const onSourceChange = (e: any) => { sourceIndex.value = e.detail.value; };

	const resetFilter = () => {
		filter.value = {
			title: '', jobCode: '',
			createdFrom: '', createdTo: '',
			dueDateFrom: '', dueDateTo: '',
			customerCode: '',
			notifyFrom: '', notifyTo: ''
		};
		statusIndex.value = 0;
		creatorIndex.value = 0;
		assigneeIndex.value = 0;
		sourceIndex.value = 0;
		selectedCustomerName.value = '';

		resetPagination();
		getTodoList('init');
		closeFilter();
	};

	const applyFilter = () => {
		resetPagination();
		getTodoList('init');
		closeFilter();
	};

	const onRefresh = async () => {
		isRefreshing.value = true;
		resetPagination();
		await getTodoList('init');
		isRefreshing.value = false;
	};

	onShow(() => {
		if (todos.value.length === 0) {
			getTodoList('init');
			fetchCustomers({});
		}
	});

	const goToDetail = (item: TodoItem) => {
		uni.navigateTo({
			url: `/pages/todo/todo_detail?id=${item.id}`
		});
	};

	const updateActivePage = (index: number) => {
		activePage.value = index;
	};

	return {
		todos, isLoading, isLoadingMore, isLoadingPrev, isRefreshing,
		onLoadMore, onLoadPrev, onRefresh,
		pageNo, startPage, pageSize, totalCount, totalPages, activePage,
		isFilterOpen, filter,
		isConfirmDeleteOpen, itemToDelete,
		pageSizeOptions,
		statusOptions, statusIndex, onStatusChange,
		creatorOptions, creatorIndex, onCreatorChange,
		assigneeOptions, assigneeIndex, onAssigneeChange,
		sourceOptions, sourceIndex, onSourceChange,
		addNewTask, openFilter, closeFilter, resetFilter, applyFilter,
		showActionMenu, cancelDelete, confirmDelete,
		showCustomerModal, loadingCustomer, customerList, selectedCustomerName,
		openCustomerPopup, onCustomerSelect, onFilterCustomerInModal,
		onUpdatePageSize, jumpToPage, updateActivePage,
		rawMemberList, fetchCustomers,
		loadingMore, loadMoreCustomers,
		isQuickCompleteOpen, quickTodos, isLoadingQuick,
		openQuickComplete, closeQuickComplete, handleQuickMarkDone,
		goToDetail
	};
};
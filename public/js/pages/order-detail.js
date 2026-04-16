const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    if (!Auth.requireAuth()) return {};

    const el = document.getElementById('app');
    const orderId = el.dataset.orderId;
    const paymentResult = ref(el.dataset.paymentResult || null);

    const order = ref(null);
    const loading = ref(true);
    const paying = ref(false);
    const verifying = ref(false);

    const statusMap = {
      pending: { label: '待付款', cls: 'bg-apricot/20 text-apricot' },
      paid: { label: '已付款', cls: 'bg-sage/20 text-sage' },
      failed: { label: '付款失敗', cls: 'bg-red-100 text-red-600' },
    };

    const paymentMessages = {
      success: { text: '付款成功！感謝您的購買。', cls: 'bg-sage/10 text-sage border border-sage/20' },
      failed: { text: '付款失敗，請重試。', cls: 'bg-red-50 text-red-600 border border-red-100' },
      cancel: { text: '付款已取消。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
      return: { text: '已返回商店，系統正確認付款狀態。', cls: 'bg-apricot/10 text-apricot border border-apricot/20' },
    };

    async function startEcpayCheckout() {
      if (!order.value || paying.value) return;
      paying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay/checkout-data', {
          method: 'POST'
        });
        const checkout = res.data;
        const form = document.createElement('form');
        form.method = checkout.method || 'POST';
        form.action = checkout.action;

        Object.entries(checkout.fields || {}).forEach(function ([key, value]) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } catch (e) {
        Notification.show(e?.data?.message || '建立付款失敗', 'error');
      } finally {
        paying.value = false;
      }
    }

    async function verifyOrderPayment(showToast = false) {
      if (!order.value || verifying.value) return;
      verifying.value = true;
      try {
        const res = await apiFetch('/api/orders/' + order.value.id + '/ecpay/verify', {
          method: 'POST'
        });
        order.value = res.data.order;

        if (order.value.status === 'paid') {
          paymentResult.value = 'success';
          if (showToast) Notification.show('已確認付款成功', 'success');
        } else if (order.value.status === 'failed') {
          paymentResult.value = 'failed';
          if (showToast) Notification.show('查詢結果為付款失敗', 'warning');
        } else {
          paymentResult.value = 'return';
          if (showToast) Notification.show('尚未確認付款完成，請稍後再查詢', 'info');
        }
      } catch (e) {
        Notification.show(e?.data?.message || '查詢付款狀態失敗', 'error');
      } finally {
        verifying.value = false;
      }
    }

    onMounted(async function () {
      try {
        const res = await apiFetch('/api/orders/' + orderId);
        order.value = res.data;
        if (paymentResult.value === 'return' && order.value.status === 'pending') {
          await verifyOrderPayment(false);
        }
      } catch (e) {
        Notification.show('載入訂單失敗', 'error');
      } finally {
        loading.value = false;
      }
    });

    return {
      order, loading, paying, verifying, paymentResult, statusMap, paymentMessages,
      startEcpayCheckout, verifyOrderPayment
    };
  }
}).mount('#app');

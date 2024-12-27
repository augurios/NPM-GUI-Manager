<template>
  <div class="modal fade" :class="{'show' : show}" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" :aria-hidden="!show">
    <div class="modal-dialog">
        <div class="modal-content blur">
        <div class="modal-header">
            <h1 class="modal-title fs-5" id="staticBackdropLabel"><slot name="title"></slot></h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <slot name="body"></slot>
        </div>
        <div class="modal-footer">
            <slot name="footer"></slot>
        </div>
        </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
export default {
    name: "ModalPrompt",
    data() {
        return {
            show: false
        };
    },
    mounted() {
        this.show = true;
    },
    methods: {
        closeModal() {
        this.$emit("close");
        },
    },
};
</script>

<style>
.modal.fade.show {
    display: block;
    z-index: 9999;
}
.modal-dialog {
    z-index: 2000;
}
.btn-close {
    color: darkgrey !important;
    filter: invert();
}
</style>

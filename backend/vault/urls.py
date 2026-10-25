"""
URL routing configuration for vault application endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, UserViewSet, DocumentViewSet, AccessGrantViewSet, AuditViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    # Auth Endpoints
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/logout/', AuthViewSet.as_view({'post': 'logout'}), name='auth-logout'),
    path('auth/me/', AuthViewSet.as_view({'get': 'me'}), name='auth-me'),

    # Access Grants Endpoints
    path('documents/<str:document_pk>/access/', AccessGrantViewSet.as_view({'get': 'list', 'post': 'create'}), name='doc-access-list'),
    path('documents/<str:document_pk>/access/<str:pk>/', AccessGrantViewSet.as_view({'delete': 'destroy'}), name='doc-access-detail'),

    # Audit Trail Endpoints
    path('audit/', AuditViewSet.as_view({'get': 'list'}), name='audit-list'),
    path('audit/stats/', AuditViewSet.as_view({'get': 'stats'}), name='audit-stats'),
    path('audit/verify-chain/', AuditViewSet.as_view({'get': 'verify_chain'}), name='audit-verify-chain'),

    path('', include(router.urls)),
]

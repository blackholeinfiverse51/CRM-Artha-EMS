# Deployment Checklist - AI CRM + Workflow Integration

## Pre-Deployment Checklist

### 1. Environment Configuration ✅

#### Workflow Backend
- [ ] `PORT` set correctly
- [ ] `MONGODB_URI` configured for production
- [ ] `JWT_SECRET` is strong and unique
- [ ] `CORS_ORIGIN` includes production URLs
- [ ] `NODE_ENV=production`

#### AI CRM Backend
- [ ] `PORT` set correctly
- [ ] `MONGODB_URI` configured
- [ ] `JWT_SECRET` matches workflow
- [ ] CORS configured for production

#### AI CRM Frontend
- [ ] `VITE_API_URL` points to production CRM API
- [ ] `VITE_WORKFLOW_API_URL` points to production Workflow API
- [ ] Build optimized for production

### 2. Database Setup ✅
- [ ] MongoDB Atlas cluster created
- [ ] Database users configured
- [ ] IP whitelist configured
- [ ] Indexes created for performance
- [ ] Backup strategy in place

### 3. Security ✅
- [ ] SSL/TLS certificates installed
- [ ] HTTPS enabled on all services
- [ ] JWT secrets are strong
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] SQL injection protection
- [ ] XSS protection enabled

### 4. Testing ✅
- [ ] All API endpoints tested
- [ ] Authentication flow verified
- [ ] Authorization checks working
- [ ] Frontend loads correctly
- [ ] Data displays properly
- [ ] Error handling works
- [ ] Auto-refresh functioning
- [ ] Mobile responsive

### 5. Performance ✅
- [ ] API response times < 500ms
- [ ] Page load times < 2s
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] CDN configured for static assets
- [ ] Compression enabled

### 6. Monitoring ✅
- [ ] Logging configured
- [ ] Error tracking setup (e.g., Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Alert system configured

---

## Deployment Steps

### Step 1: Deploy Workflow Backend

#### Option A: Render
```bash
# 1. Create new Web Service on Render
# 2. Connect GitHub repository
# 3. Set build command: cd workflow-blackhole/server && npm install
# 4. Set start command: cd workflow-blackhole/server && npm start
# 5. Add environment variables
# 6. Deploy
```

#### Option B: Railway
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
cd workflow-blackhole/server
railway init

# 4. Add environment variables
railway variables set PORT=5001
railway variables set MONGODB_URI=<your_uri>
railway variables set JWT_SECRET=<your_secret>

# 5. Deploy
railway up
```

### Step 2: Deploy AI CRM Backend

```bash
# Similar to Workflow Backend
# Use Render, Railway, or AWS EC2
```

### Step 3: Deploy AI CRM Frontend

#### Vercel Deployment
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Navigate to frontend
cd ai-crm/frontend

# 3. Build
npm run build

# 4. Deploy
vercel --prod

# 5. Set environment variables in Vercel dashboard
```

#### Netlify Deployment
```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Build
npm run build

# 3. Deploy
netlify deploy --prod --dir=dist
```

---

## Post-Deployment Verification

### 1. Service Health Checks
```bash
# Check Workflow Backend
curl https://your-workflow-api.com/health

# Check AI CRM Backend
curl https://your-crm-api.com/health

# Check Frontend
curl https://your-crm-frontend.com
```

### 2. Integration Testing
- [ ] Login to AI CRM
- [ ] Navigate to Infiverse
- [ ] Click Workflow Monitoring tab
- [ ] Verify data loads
- [ ] Check statistics display
- [ ] Verify employee table
- [ ] Test refresh button
- [ ] Confirm auto-refresh works

### 3. Performance Testing
- [ ] API response times acceptable
- [ ] Page load times acceptable
- [ ] No console errors
- [ ] No network errors
- [ ] Mobile performance good

### 4. Security Testing
- [ ] HTTPS working
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] CORS working correctly
- [ ] No sensitive data exposed

---

## Production URLs Template

### Update These After Deployment

```env
# Workflow Backend
PRODUCTION_WORKFLOW_API=https://workflow-api.your-domain.com

# AI CRM Backend
PRODUCTION_CRM_API=https://crm-api.your-domain.com

# AI CRM Frontend
PRODUCTION_CRM_FRONTEND=https://crm.your-domain.com
```

### Update Environment Variables

**Workflow Backend:**
```env
PORT=5001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-production-secret-key
FRONTEND_URL=https://crm.your-domain.com
CORS_ORIGIN=https://crm.your-domain.com
NODE_ENV=production
```

**AI CRM Frontend:**
```env
VITE_API_URL=https://crm-api.your-domain.com
VITE_WORKFLOW_API_URL=https://workflow-api.your-domain.com/api
```

---

## Rollback Plan

### If Deployment Fails

1. **Revert to Previous Version**
   ```bash
   # Render/Railway: Use dashboard to rollback
   # Vercel: vercel rollback
   ```

2. **Check Logs**
   ```bash
   # Render: View logs in dashboard
   # Railway: railway logs
   # Vercel: vercel logs
   ```

3. **Restore Database**
   ```bash
   # Use MongoDB Atlas backup
   # Restore to previous snapshot
   ```

---

## Monitoring Setup

### 1. Uptime Monitoring
- [ ] UptimeRobot configured
- [ ] Pingdom configured
- [ ] StatusPage.io setup

### 2. Error Tracking
- [ ] Sentry integrated
- [ ] Error alerts configured
- [ ] Slack notifications setup

### 3. Performance Monitoring
- [ ] New Relic configured
- [ ] DataDog setup
- [ ] Custom metrics tracked

### 4. Log Aggregation
- [ ] Loggly configured
- [ ] Papertrail setup
- [ ] CloudWatch logs enabled

---

## Maintenance Plan

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review performance metrics

### Weekly
- [ ] Review security alerts
- [ ] Check database performance
- [ ] Update dependencies

### Monthly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Backup verification
- [ ] Cost analysis

---

## Support Contacts

### Technical Support
- **Email:** blackholeems@gmail.com
- **Phone:** [Your Phone]
- **Slack:** [Your Slack Channel]

### Emergency Contacts
- **On-Call Engineer:** [Name/Phone]
- **Database Admin:** [Name/Phone]
- **DevOps Lead:** [Name/Phone]

---

## Documentation Links

- **Main README:** [README.md](./README.md)
- **Integration Guide:** [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Quick Reference:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **API Documentation:** [API_DOCS.md](./API_DOCS.md)

---

## Success Metrics

### Performance Targets
- API Response Time: < 500ms
- Page Load Time: < 2s
- Uptime: > 99.9%
- Error Rate: < 0.1%

### User Metrics
- Daily Active Users: Track
- Feature Usage: Monitor
- User Satisfaction: Survey

---

## Deployment Sign-Off

### Pre-Production
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Security audit completed
- [ ] Performance tested
- [ ] Documentation updated

### Production
- [ ] Deployed successfully
- [ ] Health checks passed
- [ ] Integration verified
- [ ] Monitoring active
- [ ] Team notified

### Sign-Off
- **Developer:** _________________ Date: _______
- **QA Lead:** _________________ Date: _______
- **DevOps:** _________________ Date: _______
- **Manager:** _________________ Date: _______

---

**Deployment Status:** 🟡 Ready for Production  
**Last Updated:** January 2025  
**Version:** 1.0.0
